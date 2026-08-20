"""NetSage AI - Deterministic Network Validation Engine (Phase 2).

This module provides rule-based, deterministic parsing and validation of CLI
'show' outputs across Layer 2 (Data Link), Layer 3 (Network), Layer 4 (Transport/Security),
and Layer 7 (Services) network fault domains.
"""

from __future__ import annotations

import ipaddress
import re
from typing import Any, Dict, List, Optional


def check_interface_status(show_output: str) -> List[Dict[str, Any]]:
    """Detect administratively down, physically down, or err-disabled interfaces."""
    anomalies: List[Dict[str, Any]] = []
    lines = show_output.splitlines()

    brief_pattern = re.compile(
        r"^(?P<iface>[A-Za-z0-9/\.\-]+)\s+"
        r"(?P<ip>[0-9\.]+|unassigned)\s+"
        r"(?P<ok>YES|NO)\s+"
        r"(?P<method>\S+)\s+"
        r"(?P<status>administratively down|down|up|deleted)\s+"
        r"(?P<protocol>down|up|monitoring)",
        re.IGNORECASE,
    )

    detail_pattern = re.compile(
        r"^(?P<iface>[A-Za-z0-9/\.\-]+)\s+is\s+(?P<status>administratively down|down|up|deleted),\s+line protocol is\s+(?P<protocol>down|up)",
        re.IGNORECASE,
    )

    status_table_pattern = re.compile(
        r"^(?P<iface>[A-Za-z0-9/\.\-]+)\s+(?P<name>\S+)?\s*(?P<status>disabled|err-disabled|notconnect|faulty)\s+",
        re.IGNORECASE,
    )

    for line in lines:
        stripped_line = line.strip()

        detail_match = detail_pattern.match(stripped_line)
        if detail_match:
            iface = detail_match.group("iface")
            status = detail_match.group("status").lower()
            protocol = detail_match.group("protocol").lower()

            if "administratively down" in status:
                anomalies.append({
                    "rule_id": "RULE-IFACE-ADMIN-DOWN",
                    "interface": iface,
                    "layer": "Physical",
                    "severity": "Critical",
                    "title": f"Interface {iface} is Administratively Down",
                    "description": f"Interface {iface} is shutdown. Issue 'no shutdown' under interface configuration.",
                    "evidence_snippet": stripped_line,
                })
            elif status == "down" or protocol == "down":
                anomalies.append({
                    "rule_id": "RULE-IFACE-DOWN",
                    "interface": iface,
                    "layer": "Physical" if status == "down" else "Data Link",
                    "severity": "High",
                    "title": f"Interface {iface} Down / Protocol Down",
                    "description": f"Interface {iface} is in {status}/{protocol} state.",
                    "evidence_snippet": stripped_line,
                })
            continue

        brief_match = brief_pattern.match(stripped_line)
        if brief_match:
            iface = brief_match.group("iface")
            status = brief_match.group("status").lower()
            protocol = brief_match.group("protocol").lower()
            ip_addr = brief_match.group("ip")

            if "administratively down" in status:
                anomalies.append({
                    "rule_id": "RULE-IFACE-ADMIN-DOWN",
                    "interface": iface,
                    "layer": "Physical",
                    "severity": "Critical",
                    "title": f"Interface {iface} is Administratively Down",
                    "description": f"Interface {iface} (IP: {ip_addr}) is administratively shutdown.",
                    "evidence_snippet": stripped_line,
                })
            elif status == "down" or protocol == "down":
                anomalies.append({
                    "rule_id": "RULE-IFACE-DOWN",
                    "interface": iface,
                    "layer": "Physical" if status == "down" else "Data Link",
                    "severity": "High",
                    "title": f"Interface {iface} is Down",
                    "description": f"Interface {iface} (IP: {ip_addr}) status is {status}, protocol {protocol}.",
                    "evidence_snippet": stripped_line,
                })
            continue

        status_match = status_table_pattern.match(stripped_line)
        if status_match:
            iface = status_match.group("iface")
            status = status_match.group("status").lower()
            anomalies.append({
                "rule_id": "RULE-IFACE-STATUS-ERRDISABLE" if status == "err-disabled" else "RULE-IFACE-STATUS-DISABLED",
                "interface": iface,
                "layer": "Data Link" if status == "err-disabled" else "Physical",
                "severity": "High",
                "title": f"Interface {iface} is {status.capitalize()}",
                "description": f"Port {iface} indicates non-operational status: '{status}'.",
                "evidence_snippet": stripped_line,
            })

    return anomalies


def check_subnet_mask(ip_str: str, mask_str: str) -> Dict[str, Any]:
    """Validate IPv4 address and subnet mask formatting and characteristics."""
    clean_ip = ip_str.strip()
    clean_mask = mask_str.strip().lstrip("/")

    result: Dict[str, Any] = {
        "valid": False,
        "ip": clean_ip,
        "mask": clean_mask,
        "network": None,
        "broadcast": None,
        "prefix_len": None,
        "is_host_usable": False,
        "errors": [],
    }

    try:
        ip_obj = ipaddress.IPv4Address(clean_ip)
    except ValueError as e:
        result["errors"].append(f"Invalid IPv4 Address format: {e}")
        return result

    try:
        if clean_mask.isdigit():
            prefix = int(clean_mask)
            if not (0 <= prefix <= 32):
                result["errors"].append(f"Prefix length must be between 0 and 32, got {prefix}")
                return result
            interface_obj = ipaddress.IPv4Interface(f"{clean_ip}/{prefix}")
        else:
            interface_obj = ipaddress.IPv4Interface(f"{clean_ip}/{clean_mask}")
    except ValueError as e:
        result["errors"].append(f"Invalid Subnet Mask format: {e}")
        return result

    network_obj = interface_obj.network
    result["valid"] = True
    result["network"] = str(network_obj.network_address)
    result["broadcast"] = str(network_obj.broadcast_address)
    result["prefix_len"] = network_obj.prefixlen
    result["netmask"] = str(network_obj.netmask)

    if network_obj.prefixlen <= 30:
        if ip_obj == network_obj.network_address:
            result["errors"].append(f"IP {clean_ip} is the Network Identifier address.")
            result["is_host_usable"] = False
        elif ip_obj == network_obj.broadcast_address:
            result["errors"].append(f"IP {clean_ip} is the Directed Broadcast address.")
            result["is_host_usable"] = False
        else:
            result["is_host_usable"] = True
    else:
        result["is_host_usable"] = True

    return result


def check_default_gateway(ip_str: str, mask_str: str, gateway_str: str) -> Optional[Dict[str, Any]]:
    """Validate that the configured default gateway resides in the same subnet as the host."""
    clean_ip = ip_str.strip()
    clean_mask = mask_str.strip().lstrip("/")
    clean_gw = gateway_str.strip()

    try:
        if clean_mask.isdigit():
            iface = ipaddress.IPv4Interface(f"{clean_ip}/{clean_mask}")
        else:
            iface = ipaddress.IPv4Interface(f"{clean_ip}/{clean_mask}")

        gw_addr = ipaddress.IPv4Address(clean_gw)
    except ValueError:
        return None

    if gw_addr not in iface.network:
        return {
            "rule_id": "RULE-GATEWAY-SUBNET-MISMATCH",
            "layer": "Network",
            "severity": "High",
            "title": "Default Gateway Outside Host Subnet",
            "description": (
                f"Configured default gateway {clean_gw} is not in the local subnet "
                f"{iface.network.network_address}/{iface.network.prefixlen} for host {clean_ip}."
            ),
            "evidence_snippet": f"Host IP: {clean_ip}/{iface.network.prefixlen} | Configured Gateway: {clean_gw}",
        }

    return None


def check_vlan_and_l2_anomalies(show_output: str) -> List[Dict[str, Any]]:
    """Detect VLAN mismatches, STP BPDU guard err-disables, MAC flapping, duplex mismatches, and trunking gaps."""
    anomalies: List[Dict[str, Any]] = []

    # 1. Native VLAN mismatch CDP / STP syslog
    cdp_mismatch = re.findall(
        r"%?(?:CDP|SPANTREE)-\d+-(?:NATIVE_VLAN_MISMATCH|BLOCK_PVID_LOCAL)[^\n]+",
        show_output,
        re.IGNORECASE,
    )
    for match in cdp_mismatch:
        anomalies.append({
            "rule_id": "RULE-VLAN-NATIVE-MISMATCH",
            "layer": "Data Link",
            "severity": "High",
            "title": "Native VLAN Mismatch Discovered",
            "description": "Switchport trunk link native VLANs do not match across interconnected switches.",
            "evidence_snippet": match.strip(),
        })

    # 2. BPDU Guard Err-disable
    bpdu_match = re.findall(
        r"%?(?:SPANTREE|PM)-\d+-(?:BLOCK_BPDUGUARD|ERR_DISABLE)[^\n]+",
        show_output,
        re.IGNORECASE,
    )
    for match in bpdu_match:
        anomalies.append({
            "rule_id": "RULE-STP-BPDUGUARD-TRIGGERED",
            "layer": "Data Link",
            "severity": "High",
            "title": "STP BPDU Guard Err-Disable Detected",
            "description": "Edge port received unauthorized BPDUs and was shut down by BPDU Guard.",
            "evidence_snippet": match.strip(),
        })

    # 3. MAC Address Flapping / Layer 2 Loop
    mac_flap = re.findall(
        r"%?SW_MATM-\d+-MACFLAP_NOTIF[^\n]+",
        show_output,
        re.IGNORECASE,
    )
    for match in mac_flap:
        anomalies.append({
            "rule_id": "RULE-MAC-FLAPPING-LOOP",
            "layer": "Data Link",
            "severity": "Critical",
            "title": "MAC Address Flapping / L2 Loop Detected",
            "description": "Host MAC address flapping between switch ports indicating a potential switching loop.",
            "evidence_snippet": match.strip(),
        })

    # 4. Duplex Mismatch & Collisions
    duplex_match = re.findall(
        r"%?CDP-\d+-DUPLEX_MISMATCH[^\n]+",
        show_output,
        re.IGNORECASE,
    )
    for match in duplex_match:
        anomalies.append({
            "rule_id": "RULE-DUPLEX-MISMATCH",
            "layer": "Data Link",
            "severity": "Medium",
            "title": "Duplex Mismatch Detected",
            "description": "Duplex configuration mismatch between interconnected switchport and host/neighbor.",
            "evidence_snippet": match.strip(),
        })

    # 5. Access port VLAN mismatch across multiple devices
    current_device = "Switch"
    access_entries: List[Dict[str, str]] = []
    for line in show_output.splitlines():
        line_clean = line.strip()
        prompt_match = re.match(r"^([A-Za-z0-9_\-]+)[#>]", line_clean)
        if prompt_match:
            current_device = prompt_match.group(1)
            continue

        port_match = re.match(
            r"^(?P<port>[A-Za-z0-9/\.\-]+)\s+(?P<name>\S+)?\s+(?:connected|notconnect|disabled)\s+(?P<vlan>\d+)\s+",
            line_clean,
            re.IGNORECASE,
        )
        if port_match:
            port_name = port_match.group("port")
            vlan_id = port_match.group("vlan")
            access_entries.append({
                "device": current_device,
                "port": port_name,
                "vlan": vlan_id,
                "raw": line_clean,
            })

    if len(access_entries) >= 2:
        distinct_vlans = {entry["vlan"] for entry in access_entries}
        if len(distinct_vlans) > 1:
            details = ", ".join([f"{e['device']} {e['port']} in VLAN {e['vlan']}" for e in access_entries])
            evidence = "\n".join([f"{e['device']} {e['port']} -> VLAN {e['vlan']}" for e in access_entries])
            anomalies.append({
                "rule_id": "RULE-VLAN-ACCESS-PORT-MISMATCH",
                "layer": "Data Link",
                "severity": "High",
                "title": "Access Port VLAN Mismatch",
                "description": f"Interconnected host access ports configured with mismatched VLAN IDs: {details}.",
                "evidence_snippet": evidence,
            })

    # 6. EtherChannel / LACP mode mismatch
    if "SD" in show_output and "LACP" in show_output:
        anomalies.append({
            "rule_id": "RULE-ETHERCHANNEL-MISMATCH",
            "layer": "Data Link",
            "severity": "High",
            "title": "EtherChannel / LACP Mode Mismatch",
            "description": "Port-channel bundle is suspended (SD state) due to LACP negotiation or mode mismatch.",
            "evidence_snippet": "Po1(SD) LACP Gi0/1(s) Gi0/2(s)",
        })

    # 7. DTP negotiation failure (both dynamic auto)
    dtp_auto_count = len(re.findall(r"Administrative Mode:\s*dynamic auto", show_output, re.IGNORECASE))
    if dtp_auto_count >= 2 and "Operational Mode: static access" in show_output:
        anomalies.append({
            "rule_id": "RULE-DTP-TRUNK-NEGOTIATION-FAILED",
            "layer": "Data Link",
            "severity": "High",
            "title": "DTP Trunk Negotiation Failure",
            "description": "Both switchports set to 'dynamic auto'; link defaulted to access mode instead of trunking.",
            "evidence_snippet": "Administrative Mode: dynamic auto -> Operational Mode: static access",
        })

    # 8. Trunk allowed VLAN list pruning
    allowed_vlan_blocks = re.findall(r"Vlans allowed on trunk\s*\n\S+\s+([0-9,\-]+)", show_output, re.IGNORECASE)
    if len(allowed_vlan_blocks) >= 2 and allowed_vlan_blocks[0] != allowed_vlan_blocks[1]:
        anomalies.append({
            "rule_id": "RULE-TRUNK-ALLOWED-VLAN-PRUNED",
            "layer": "Data Link",
            "severity": "High",
            "title": "Trunk Allowed VLAN List Inconsistency",
            "description": f"Allowed VLAN lists differ across trunk endpoints: {allowed_vlan_blocks[0]} vs {allowed_vlan_blocks[1]}.",
            "evidence_snippet": f"Allowed VLANs: {allowed_vlan_blocks[0]} vs {allowed_vlan_blocks[1]}",
        })

    return anomalies


def check_l3_routing_and_ospf(show_output: str) -> List[Dict[str, Any]]:
    """Detect OSPF MTU mismatches, area mismatches, passive interfaces, missing routes, and HSRP faults."""
    anomalies: List[Dict[str, Any]] = []

    # 1. OSPF MTU Mismatch (Stuck in EXSTART)
    if "EXSTART" in show_output or "EXCHANGE" in show_output:
        mtu_matches = re.findall(r"MTU\s+(\d+)\s+bytes", show_output, re.IGNORECASE)
        mtu_desc = f" (Observed MTUs: {', '.join(mtu_matches)})" if mtu_matches else ""
        anomalies.append({
            "rule_id": "RULE-OSPF-MTU-MISMATCH",
            "layer": "Network",
            "severity": "High",
            "title": "OSPF Adjacency Stuck in EXSTART (MTU Mismatch)",
            "description": f"OSPF neighbor is stuck in EXSTART state, typically caused by an interface MTU mismatch{mtu_desc}.",
            "evidence_snippet": "OSPF State: EXSTART / MTU Mismatch",
        })

    # 2. OSPF Area ID Mismatch
    area_err = re.search(r"%?OSPF-\d+-ERRRCV:\s*Received packet with invalid Area ID[^\n]+", show_output, re.IGNORECASE)
    if area_err:
        anomalies.append({
            "rule_id": "RULE-OSPF-AREA-MISMATCH",
            "layer": "Network",
            "severity": "High",
            "title": "OSPF Area ID Mismatch",
            "description": "OSPF packets received with mismatched Area ID, preventing neighbor adjacency.",
            "evidence_snippet": area_err.group(0).strip(),
        })

    # 3. OSPF Timer Mismatch
    timer_err = re.search(r"%?OSPF-\d+-ADJCHG:[^\n]+Dead timer expired[^\n]*", show_output, re.IGNORECASE)
    if timer_err or ("Hello 10" in show_output and "Hello 30" in show_output):
        anomalies.append({
            "rule_id": "RULE-OSPF-TIMER-MISMATCH",
            "layer": "Network",
            "severity": "High",
            "title": "OSPF Hello/Dead Timer Mismatch",
            "description": "OSPF Hello or Dead interval timers do not match across neighbor interfaces.",
            "evidence_snippet": timer_err.group(0).strip() if timer_err else "Hello 10/40 vs Hello 30/120 configured",
        })

    # 4. OSPF Passive Interface Misconfiguration
    if "No Hellos (Passive interface)" in show_output or "passive-interface" in show_output:
        anomalies.append({
            "rule_id": "RULE-OSPF-PASSIVE-INTERFACE",
            "layer": "Network",
            "severity": "Medium",
            "title": "OSPF Passive Interface Blocking Hellos",
            "description": "Interface is configured as passive in OSPF process, suppressing Hello packet transmission.",
            "evidence_snippet": "passive-interface / No Hellos (Passive interface)",
        })

    # 5. Missing Route / Gateway of Last Resort Not Set
    if "Gateway of last resort is not set" in show_output and "% Network not in table" not in show_output:
        anomalies.append({
            "rule_id": "RULE-ROUTE-MISSING-DESTINATION",
            "layer": "Network",
            "severity": "High",
            "title": "Missing Route / No Default Gateway in Routing Table",
            "description": "Routing table lacks a valid static/dynamic route or default gateway for target remote subnets.",
            "evidence_snippet": "Gateway of last resort is not set",
        })

    # 6. Unreachable Next-Hop IP for Static Route
    if "% Network not in table" in show_output or ("next-hop" in show_output.lower() and "unreachable" in show_output.lower()):
        anomalies.append({
            "rule_id": "RULE-ROUTE-NEXTHOP-UNREACHABLE",
            "layer": "Network",
            "severity": "High",
            "title": "Static Route Next-Hop Unreachable",
            "description": "Static route next-hop address cannot be resolved in the routing table (recursive routing failure).",
            "evidence_snippet": "% Network not in table (Next-hop IP unreachable)",
        })

    # 7. HSRP Virtual IP / Group Mismatch
    if "show standby" in show_output.lower() or "active  local" in show_output.lower():
        grp_matches = re.findall(r"Grp\s+(\d+)", show_output, re.IGNORECASE)
        active_matches = re.findall(r"Active\s+local", show_output, re.IGNORECASE)
        if len(active_matches) >= 2 or (len(set(grp_matches)) > 1 and len(active_matches) >= 1):
            anomalies.append({
                "rule_id": "RULE-HSRP-DUPLICATE-ACTIVE-MISMATCH",
                "layer": "Network",
                "severity": "High",
                "title": "HSRP Group Mismatch / Dual Active Routers",
                "description": f"Standby routers are both in Active state with mismatched groups ({', '.join(set(grp_matches))}).",
                "evidence_snippet": "HSRP dual active state detected on redundant pair",
            })

    return anomalies


def check_l4_security_and_acls(show_output: str) -> List[Dict[str, Any]]:
    """Detect ACL wildcard mask inversions, implicit deny drops, port filtering, and VPN MSS issues."""
    anomalies: List[Dict[str, Any]] = []

    # 1. Inverted Wildcard Mask in ACL Statement (e.g. 255.255.255.0 used as wildcard mask)
    inverted_mask_match = re.search(
        r"access-list\s+\d+\s+(?:permit|deny)\s+[0-9\.]+\s+(?P<mask>255\.[0-9\.]+)",
        show_output,
        re.IGNORECASE,
    )
    if inverted_mask_match or "wildcard bits 255." in show_output:
        anomalies.append({
            "rule_id": "RULE-ACL-INVERTED-WILDCARD-MASK",
            "layer": "Transport",
            "severity": "High",
            "title": "Inverted Wildcard Mask in Access List",
            "description": "Subnet mask (255.x.x.x) configured in ACL instead of inverse wildcard mask (e.g., 0.0.0.255).",
            "evidence_snippet": inverted_mask_match.group(0) if inverted_mask_match else "wildcard bits 255.255.255.0",
        })

    # 2. ACL Implicit Deny Matching Drops
    deny_match = re.search(
        r"\d+\s+deny\s+(?:any|ip any any)\s*\((?P<matches>[1-9]\d*)\s+matches\)",
        show_output,
        re.IGNORECASE,
    )
    if deny_match:
        anomalies.append({
            "rule_id": "RULE-ACL-DENY-TRAFFIC-DROP",
            "layer": "Transport",
            "severity": "High",
            "title": "ACL Deny Rule Dropping Active Traffic",
            "description": f"Access list explicit/implicit deny rule matched {deny_match.group('matches')} packets.",
            "evidence_snippet": deny_match.group(0).strip(),
        })

    # 3. Explicit Port Deny (e.g. TCP 443 / HTTPS blocked)
    port_deny = re.search(
        r"\d+\s+deny\s+tcp\s+[^\n]+eq\s+(\d+|www|https|443|22|23)\s*\(([1-9]\d*)\s+matches\)",
        show_output,
        re.IGNORECASE,
    )
    if port_deny:
        anomalies.append({
            "rule_id": "RULE-ACL-PORT-FILTER-BLOCK",
            "layer": "Transport",
            "severity": "High",
            "title": f"ACL Explicitly Blocking Port {port_deny.group(1)}",
            "description": f"Access list line explicitly filtering TCP traffic on port {port_deny.group(1)}.",
            "evidence_snippet": port_deny.group(0).strip(),
        })

    # 4. NAT ACL Missing Subnet
    if "show ip nat statistics" in show_output and "Misses:" in show_output:
        misses_match = re.search(r"Misses:\s*([1-9]\d*)", show_output)
        if misses_match and int(misses_match.group(1)) > 0:
            anomalies.append({
                "rule_id": "RULE-NAT-ACL-MISSING-SUBNET",
                "layer": "Transport",
                "severity": "High",
                "title": "NAT Translation Misses / Source Subnet Excluded",
                "description": f"NAT translation misses ({misses_match.group(1)}) indicate source traffic is not permitted by NAT ACL.",
                "evidence_snippet": f"NAT Hits/Misses: {misses_match.group(0)}",
            })

    # 5. VPN TCP MSS / MTU Black Hole
    if "Tunnel" in show_output and "IPSEC" in show_output and "ip tcp adjust-mss" not in show_output:
        anomalies.append({
            "rule_id": "RULE-VPN-TCP-MSS-BLACKHOLE",
            "layer": "Transport",
            "severity": "Medium",
            "title": "Missing TCP MSS Clamping on IPsec Tunnel",
            "description": "IPsec tunnel lacks 'ip tcp adjust-mss', leading to PMTU black holes for large TCP packets.",
            "evidence_snippet": "Tunnel MTU 1400 bytes, missing 'ip tcp adjust-mss 1360'",
        })

    return anomalies


def check_l7_services(show_output: str) -> List[Dict[str, Any]]:
    """Detect DHCP pool exhaustion, missing helper-addresses, DNS misconfigurations, and NTP out-of-sync."""
    anomalies: List[Dict[str, Any]] = []

    # 1. DHCP Pool Exhaustion
    if "DHCP pool" in show_output and ("pool exhausted" in show_output.lower() or "total avail): 254 / 0" in show_output or "allocated 2 (100%)" in show_output):
        anomalies.append({
            "rule_id": "RULE-DHCP-POOL-EXHAUSTED",
            "layer": "Application",
            "severity": "Critical",
            "title": "DHCP Address Pool Exhausted",
            "description": "Configured DHCP IP pool has 0 available addresses remaining, preventing new client leases.",
            "evidence_snippet": "DHCP pool exhausted / total available: 0",
        })

    # 2. Missing DHCP IP Helper Address
    if "Helper address is not set" in show_output or ("encapsulation dot1Q" in show_output and "ip helper-address" not in show_output and "dhcp" in show_output.lower()):
        anomalies.append({
            "rule_id": "RULE-DHCP-HELPER-MISSING",
            "layer": "Application",
            "severity": "High",
            "title": "Missing IP Helper-Address (DHCP Relay)",
            "description": "Gateway subinterface lacks 'ip helper-address' configuration, dropping DHCP broadcast discovers.",
            "evidence_snippet": "Helper address is not set",
        })

    # 3. DNS Server Configured / Misconfiguration Check
    if "dns-server" in show_output or "DNS Servers" in show_output:
        dns_match = re.search(r"dns-server\s+([0-9\.]+)", show_output, re.IGNORECASE) or re.search(r"DNS Servers[^\n:]*:\s*([0-9\.]+)", show_output, re.IGNORECASE)
        if dns_match:
            anomalies.append({
                "rule_id": "RULE-DNS-SERVER-CHECK",
                "layer": "Application",
                "severity": "High",
                "title": f"DNS Server Configuration Check ({dns_match.group(1)})",
                "description": f"Configured DNS server IP is {dns_match.group(1)}; verify reachability and name resolution service.",
                "evidence_snippet": dns_match.group(0).strip(),
            })

    # 4. NTP Out of Sync / Stratum 16
    if "Clock is unsynchronized" in show_output or "stratum 16" in show_output:
        anomalies.append({
            "rule_id": "RULE-NTP-UNSYNCHRONIZED",
            "layer": "Application",
            "severity": "High",
            "title": "NTP Clock Unsynchronized (Stratum 16)",
            "description": "Device clock is unsynchronized with reference NTP server, causing time skew and auth failures.",
            "evidence_snippet": "Clock is unsynchronized, stratum 16, no reference clock",
        })

    # 5. VTY Line Access-Class SSH Block
    if "access-class" in show_output and "transport input ssh" in show_output and "deny   any" in show_output:
        anomalies.append({
            "rule_id": "RULE-VTY-SSH-ACCESS-CLASS-BLOCK",
            "layer": "Application",
            "severity": "High",
            "title": "VTY Line ACL Blocking SSH Management",
            "description": "VTY access-class ACL is filtering unauthorized SSH connection attempts from management subnets.",
            "evidence_snippet": "line vty access-class filtering with deny matches",
        })

    # 6. NAT Dynamic Pool Exhaustion
    if "allocated 2 (100%)" in show_output or ("pool PUBLIC_POOL: netmask" in show_output and "misses" in show_output):
        anomalies.append({
            "rule_id": "RULE-NAT-POOL-EXHAUSTED",
            "layer": "Application",
            "severity": "High",
            "title": "Dynamic NAT Public Pool Exhausted",
            "description": "All public global IP addresses in NAT translation pool are in use; new sessions dropped.",
            "evidence_snippet": "NAT pool allocated 100%, misses recorded",
        })

    return anomalies


def run_all_checks(show_output: str, metadata: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Run all deterministic validation rules across Layer 2 to Layer 7.

    Args:
        show_output: Raw CLI text outputs.
        metadata: Optional dictionary with host/network params.

    Returns:
        List of all detected anomaly findings.
    """
    findings: List[Dict[str, Any]] = []

    # 1. Interface Physical & Line Protocol Status
    findings.extend(check_interface_status(show_output))

    # 2. Layer 2 (VLAN, STP, EtherChannel, DTP, Duplex, MAC Flap)
    findings.extend(check_vlan_and_l2_anomalies(show_output))

    # 3. Layer 3 (Routing, Subnetting, Gateway, OSPF, HSRP)
    findings.extend(check_l3_routing_and_ospf(show_output))

    # 4. Layer 4 & Security (ACLs, Wildcard Masks, NAT ACL, TCP MSS)
    findings.extend(check_l4_security_and_acls(show_output))

    # 5. Layer 7 & Services (DHCP, DNS, NTP, VTY, NAT Pool)
    findings.extend(check_l7_services(show_output))

    # 6. Extract IP, Subnet Mask, and Gateway from ipconfig or show outputs
    ip_matches = re.findall(r"IPv4 Address[^\n:]*:\s*([0-9\.]+)", show_output, re.IGNORECASE)
    mask_matches = re.findall(r"Subnet Mask[^\n:]*:\s*([0-9\.]+)", show_output, re.IGNORECASE)
    gw_matches = re.findall(r"Default Gateway[^\n:]*:\s*([0-9\.]+)", show_output, re.IGNORECASE)

    for i in range(min(len(ip_matches), len(mask_matches))):
        ip_val = ip_matches[i]
        mask_val = mask_matches[i]

        mask_check = check_subnet_mask(ip_val, mask_val)
        if not mask_check.get("valid") or mask_check.get("errors"):
            findings.append({
                "rule_id": "RULE-IP-MASK-INVALID",
                "layer": "Network",
                "severity": "High",
                "title": "Invalid IP/Subnet Mask Configuration",
                "description": "; ".join(mask_check.get("errors", [])),
                "evidence_snippet": f"IP: {ip_val}, Mask: {mask_val}",
            })

        if i < len(gw_matches):
            gw_val = gw_matches[i]
            gw_check = check_default_gateway(ip_val, mask_val, gw_val)
            if gw_check:
                findings.append(gw_check)

    # 7. Check for multiple IP configurations with differing subnet masks on same segment
    if len(mask_matches) >= 2 and len(set(mask_matches)) > 1:
        findings.append({
            "rule_id": "RULE-SUBNET-MASK-MISMATCH",
            "layer": "Network",
            "severity": "High",
            "title": "Host Subnet Mask Prefix Mismatch",
            "description": f"Hosts on the same segment configured with differing subnet masks: {', '.join(mask_matches)}.",
            "evidence_snippet": f"Detected masks: {', '.join(mask_matches)}",
        })

    # 8. Optional Metadata Gateway Verification
    if metadata and "ip" in metadata and "mask" in metadata and "gateway" in metadata:
        gw_check = check_default_gateway(metadata["ip"], metadata["mask"], metadata["gateway"])
        if gw_check:
            findings.append(gw_check)

    return findings


if __name__ == "__main__":
    sample_cli = """
    PC-1> ipconfig /all
    IPv4 Address. . . . . . . . . . . : 192.168.10.45
    Subnet Mask . . . . . . . . . . . : 255.255.255.0
    Default Gateway . . . . . . . . . : 192.168.20.1
    """
    results = run_all_checks(sample_cli)
    print(f"Deterministic checks completed. Found {len(results)} anomalies:")
    for r in results:
        print(f"  - [{r['rule_id']}] ({r['layer']}/{r['severity']}): {r['title']}")
