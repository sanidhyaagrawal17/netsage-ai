"""
topology_graph.py - Vision-to-Graph (V2G) Network Property Graph Engine
Part of NetSage AI Academic Novelty Framework.

Formalizes network states into a Heterogeneous Network Property Graph G = (V, E, Phi)
using NetworkX, enabling deterministic Layer 2 spanning-tree reachability,
inter-VLAN isolation detection, and Layer 3 routing cut-set analysis.
"""

import re
import ipaddress
from typing import Dict, List, Optional, Set, Tuple, Any
import networkx as nx


class NetworkPropertyGraph:
    """
    Heterogeneous Network Property Graph representing simulated Cisco Packet Tracer networks.
    Nodes: Devices (Routers, Switches, PCs, Servers), Subnets, and VLANs.
    Edges: Physical links, 802.1Q Trunks, Access assignments, and Routing Adjacencies.
    """

    def __init__(self, name: str = "NetSage-Topology"):
        self.name = name
        self.graph = nx.MultiGraph()
        self.device_interfaces: Dict[str, Dict[str, Dict[str, Any]]] = {}

    def add_device(self, device_id: str, device_type: str = "Router", model: str = "", x: Optional[int] = None, y: Optional[int] = None):
        """Register a network device node with optional coordinates."""
        dev_id = device_id.strip()
        dtype = device_type.capitalize()
        attrs = {"node_type": "device", "device_type": dtype, "model": model}
        if x is not None and y is not None:
            attrs["x"] = int(x)
            attrs["y"] = int(y)
        self.graph.add_node(dev_id, **attrs)
        if dev_id not in self.device_interfaces:
            self.device_interfaces[dev_id] = {}

    def add_interface(
        self,
        device_id: str,
        interface_name: str,
        ip_addr: Optional[str] = None,
        subnet_mask: Optional[str] = None,
        vlan: Optional[int] = None,
        is_trunk: bool = False,
        native_vlan: int = 1,
        allowed_vlans: Optional[List[int]] = None,
        status: str = "up"
    ):
        """Add or update an interface on a device with L2/L3 properties."""
        dev_id = device_id.strip()
        intf = interface_name.strip()
        if dev_id not in self.device_interfaces:
            self.add_device(dev_id)

        cidr = None
        network = None
        if ip_addr and subnet_mask:
            try:
                net = ipaddress.IPv4Network(f"{ip_addr}/{subnet_mask}", strict=False)
                cidr = f"{ip_addr}/{net.prefixlen}"
                network = str(net)
            except Exception:
                pass

        intf_data = {
            "name": intf,
            "ip": ip_addr,
            "mask": subnet_mask,
            "cidr": cidr,
            "network": network,
            "vlan": vlan,
            "is_trunk": is_trunk,
            "native_vlan": native_vlan,
            "allowed_vlans": allowed_vlans if allowed_vlans is not None else ([vlan] if vlan else [1]),
            "status": status.lower()
        }
        self.device_interfaces[dev_id][intf] = intf_data

        if network:
            subnet_node = f"Subnet_{network}"
            if not self.graph.has_node(subnet_node):
                self.graph.add_node(subnet_node, node_type="subnet", prefix=network)
            self.graph.add_edge(dev_id, subnet_node, relation="member_of", interface=intf, ip=ip_addr)

    def add_link(
        self,
        dev_a: str,
        intf_a: str,
        dev_b: str,
        intf_b: str,
        link_type: str = "Ethernet",
        is_trunk: bool = False,
        native_vlan: int = 1,
        allowed_vlans: Optional[List[int]] = None
    ):
        """Add a bidirectional link between two device interfaces."""
        if not self.graph.has_node(dev_a):
            self.add_device(dev_a)
        if not self.graph.has_node(dev_b):
            self.add_device(dev_b)

        edge_attrs = {
            "intf_a": intf_a,
            "intf_b": intf_b,
            "link_type": link_type,
            "is_trunk": is_trunk,
            "native_vlan": native_vlan,
            "allowed_vlans": allowed_vlans if allowed_vlans is not None else [1]
        }
        self.graph.add_edge(dev_a, dev_b, relation="physical_link", **edge_attrs)

    def check_l2_reachability(self, dev_a: str, dev_b: str, vlan_id: int = 1) -> Dict[str, Any]:
        """
        Formally verifies Layer 2 broadcast reachability between dev_a and dev_b in vlan_id.
        """
        if not self.graph.has_node(dev_a) or not self.graph.has_node(dev_b):
            return {
                "reachable": False,
                "reason": f"One or both devices not found in graph: '{dev_a}', '{dev_b}'",
                "fault_layer": "Physical"
            }

        device_subgraph = nx.Graph()
        for u, v, k, data in self.graph.edges(data=True, keys=True):
            if data.get("relation") == "physical_link":
                if data.get("is_trunk"):
                    allowed = data.get("allowed_vlans", [])
                    if vlan_id in allowed:
                        device_subgraph.add_edge(u, v, **data)
                else:
                    device_subgraph.add_edge(u, v, **data)

        if not nx.has_path(device_subgraph, dev_a, dev_b):
            return {
                "reachable": False,
                "reason": f"No continuous Layer-2 path in VLAN {vlan_id} between {dev_a} and {dev_b}. Check trunk configurations or physical connectivity.",
                "fault_layer": "Data Link",
                "vlan": vlan_id
            }

        path = nx.shortest_path(device_subgraph, dev_a, dev_b)

        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            edge_data = device_subgraph.get_edge_data(u, v)
            if edge_data and edge_data.get("is_trunk"):
                intf_u = edge_data.get("intf_a")
                intf_v = edge_data.get("intf_b")
                dev_u_intfs = self.device_interfaces.get(u, {})
                dev_v_intfs = self.device_interfaces.get(v, {})
                native_u = dev_u_intfs.get(intf_u, {}).get("native_vlan", edge_data.get("native_vlan", 1))
                native_v = dev_v_intfs.get(intf_v, {}).get("native_vlan", edge_data.get("native_vlan", 1))
                if native_u != native_v:
                    return {
                        "reachable": False,
                        "reason": f"Native VLAN mismatch between {u}:{intf_u} (VLAN {native_u}) and {v}:{intf_v} (VLAN {native_v}).",
                        "fault_layer": "Data Link",
                        "anomaly": "NATIVE_VLAN_MISMATCH",
                        "devices": [u, v]
                    }

        return {
            "reachable": True,
            "path": path,
            "vlan": vlan_id,
            "hop_count": len(path) - 1
        }

    def check_l3_reachability(self, src_ip: str, dst_ip: str) -> Dict[str, Any]:
        """
        Formally verifies Layer 3 routing reachability between two IP addresses.
        """
        try:
            s_ip = ipaddress.IPv4Address(src_ip.strip())
            d_ip = ipaddress.IPv4Address(dst_ip.strip())
        except ValueError as e:
            return {"reachable": False, "reason": f"Invalid IP address format: {e}", "fault_layer": "Network"}

        src_subnet = None
        dst_subnet = None

        for node, data in self.graph.nodes(data=True):
            if data.get("node_type") == "subnet":
                prefix = data.get("prefix")
                try:
                    net = ipaddress.IPv4Network(prefix, strict=False)
                    if s_ip in net:
                        src_subnet = node
                    if d_ip in net:
                        dst_subnet = node
                except Exception:
                    continue

        if not src_subnet:
            return {
                "reachable": False,
                "reason": f"Source IP {src_ip} does not belong to any modeled subnet in topology.",
                "fault_layer": "Network"
            }
        if not dst_subnet:
            return {
                "reachable": False,
                "reason": f"Destination IP {dst_ip} does not belong to any modeled subnet in topology.",
                "fault_layer": "Network"
            }

        if src_subnet == dst_subnet:
            return {
                "reachable": True,
                "type": "Direct_IntraSubnet",
                "subnet": src_subnet
            }

        routing_graph = nx.Graph()
        for u, v, data in self.graph.edges(data=True):
            if data.get("relation") == "member_of":
                routing_graph.add_edge(u, v)

        if not nx.has_path(routing_graph, src_subnet, dst_subnet):
            return {
                "reachable": False,
                "reason": f"No routed path exists between {src_subnet} and {dst_subnet}. Missing default gateway or routing protocol adjacency.",
                "fault_layer": "Network",
                "anomaly": "ROUTING_BLACKHOLE"
            }

        path = nx.shortest_path(routing_graph, src_subnet, dst_subnet)
        routers_in_path = [node for node in path if not node.startswith("Subnet_")]

        return {
            "reachable": True,
            "type": "Routed_InterSubnet",
            "path": path,
            "routers": routers_in_path,
            "hop_count": len(routers_in_path)
        }

    def compute_cut_set(self, dev_a: str, dev_b: str) -> List[Tuple[str, str]]:
        """
        Computes the minimum edge cut in the network topology between dev_a and dev_b.
        """
        device_subgraph = nx.Graph()
        for u, v, data in self.graph.edges(data=True):
            if data.get("relation") == "physical_link":
                device_subgraph.add_edge(u, v)

        if not nx.has_path(device_subgraph, dev_a, dev_b):
            return []

        try:
            cut = nx.minimum_edge_cut(device_subgraph, dev_a, dev_b)
            return list(cut)
        except Exception:
            return []

    def to_dict(self) -> Dict[str, Any]:
        nodes = []
        for n, d in self.graph.nodes(data=True):
            nodes.append({"id": n, **d})

        edges = []
        for u, v, d in self.graph.edges(data=True):
            edges.append({"source": u, "target": v, **d})

        return {
            "name": self.name,
            "nodes": nodes,
            "edges": edges,
            "device_count": len([n for n, d in self.graph.nodes(data=True) if d.get("node_type") == "device"]),
            "subnet_count": len([n for n, d in self.graph.nodes(data=True) if d.get("node_type") == "subnet"]),
        }

    def to_dot(self) -> str:
        """Export topology graph into Graphviz DOT dynamic DSL."""
        lines = [
            f'digraph "{self.name}" {{',
            '  graph [rankdir=LR, bgcolor="#090d16", pad="0.5", nodesep="0.6", ranksep="0.8"];',
            '  node [shape=box, style="filled,rounded", fontname="system-ui, sans-serif", fontsize=10, penwidth=1.5];',
            '  edge [fontname="monospace", fontsize=9, penwidth=2.0];',
            ''
        ]
        
        colors = {
            "Router": {"fill": "#0f172a", "font": "#38bdf8", "border": "#0284c7"},
            "Switch": {"fill": "#0f172a", "font": "#60a5fa", "border": "#2563eb"},
            "Host":   {"fill": "#0f172a", "font": "#34d399", "border": "#059669"},
            "Subnet": {"fill": "#18181b", "font": "#a1a1aa", "border": "#52525b"}
        }

        for n, d in self.graph.nodes(data=True):
            ntype = d.get("device_type", d.get("node_type", "Host")).capitalize()
            style = colors.get(ntype, colors["Host"])
            label = d.get("label", n)
            subtext = ""
            if n in self.device_interfaces:
                ips = [v["ip"] for v in self.device_interfaces[n].values() if v.get("ip")]
                if ips:
                    subtext = f"\\n{ips[0]}"
                elif ntype == "Switch":
                    subtext = "\\nCatalyst 2960"
            lines.append(f'  "{n}" [label="{label}{subtext}", fillcolor="{style["fill"]}", fontcolor="{style["font"]}", color="{style["border"]}"];')

        lines.append('')
        for u, v, d in self.graph.edges(data=True):
            if d.get("relation") == "member_of":
                continue
            is_trunk = d.get("is_trunk", False)
            status = d.get("status", "up").lower()
            edge_color = "#38bdf8"
            edge_style = "solid"
            if status == "down":
                edge_color = "#f43f5e"
                edge_style = "dashed"
            elif status == "mismatch":
                edge_color = "#fbbf24"
                edge_style = "dotted"
            
            lbl_parts = []
            if d.get("intf_a") and d.get("intf_b"):
                lbl_parts.append(f"{d.get('intf_a')} <-> {d.get('intf_b')}")
            if is_trunk:
                lbl_parts.append(f"Trunk (Native {d.get('native_vlan', 1)})")
            
            lbl = " | ".join(lbl_parts)
            lines.append(f'  "{u}" -> "{v}" [label="{lbl}", color="{edge_color}", fontcolor="{edge_color}", style="{edge_style}", dir="none"];')

        lines.append('}')
        return '\n'.join(lines)

    def to_react_flow(self) -> Dict[str, Any]:
        """Convert graph into React Flow compatible nodes and edges structure with hierarchical enterprise layout."""
        nodes = []
        edges = []

        device_nodes = [n for n, d in self.graph.nodes(data=True) if d.get("node_type") == "device"]
        
        # Predefined canonical positions for standard enterprise devices
        canonical_positions = {
            "host-a": {"x": 60, "y": 200},
            "sw1": {"x": 320, "y": 200},
            "sw2": {"x": 640, "y": 200},
            "host-b": {"x": 900, "y": 200},
            "r2-backup": {"x": 480, "y": 50},
            "r1": {"x": 320, "y": 50},
            "r2": {"x": 640, "y": 50},
        }

        for i, n in enumerate(device_nodes):
            d = self.graph.nodes[n]
            dtype = d.get("device_type", "Router").lower()
            flow_type = "ciscoRouter"
            if "switch" in dtype:
                flow_type = "ciscoSwitch"
            elif "server" in dtype:
                flow_type = "ciscoServer"
            elif "host" in dtype or "pc" in dtype or "endpoint" in dtype:
                flow_type = "ciscoHost"

            dev_intfs = self.device_interfaces.get(n, {})
            intf_list = []
            ip_val = None
            vlan_val = None
            is_mismatch = False

            for iname, idata in dev_intfs.items():
                if idata.get("ip"):
                    ip_val = idata["cidr"] or idata["ip"]
                if idata.get("is_trunk"):
                    vlan_val = f"Trunk Native {idata.get('native_vlan', 1)}"
                    intf_desc = "Trunk"
                elif idata.get("vlan"):
                    vlan_val = f"VLAN {idata.get('vlan')}"
                    intf_desc = f"VLAN {idata.get('vlan')}"
                else:
                    intf_desc = "Access"
                intf_val = idata.get("ip") or intf_desc
                intf_list.append(f"{iname}: {intf_val}")

            for _, v, edata in self.graph.edges(n, data=True):
                if edata.get("status") == "mismatch":
                    is_mismatch = True

            norm_id = n.lower().replace(" ", "-")
            pos = None
            if "x" in d and "y" in d:
                pos = {"x": int(d["x"]), "y": int(d["y"])}
            if not pos:
                pos = canonical_positions.get(norm_id)
            if not pos:
                tier_y = 60 if flow_type == "ciscoRouter" else (220 if flow_type == "ciscoSwitch" else 400)
                pos = {"x": 100 + (i * 240), "y": tier_y}

            nodes.append({
                "id": norm_id,
                "type": flow_type,
                "position": pos,
                "data": {
                    "rawId": n,
                    "label": n,
                    "deviceType": d.get("device_type", "Device"),
                    "ip": ip_val or ("10.1.10.5/24" if flow_type == "ciscoHost" else ("10.1.10.254" if "r2" in norm_id else "192.168.1.1")),
                    "vlan": vlan_val or ("VLAN 10" if flow_type == "ciscoHost" else "Native: VLAN 1"),
                    "isMismatch": is_mismatch,
                    "interfaces": intf_list or ["FastEthernet0/1 (Up)"]
                }
            })

        for u, v, edata in self.graph.edges(data=True):
            if edata.get("relation") == "member_of":
                continue
            u_id = u.lower().replace(" ", "-")
            v_id = v.lower().replace(" ", "-")
            status = edata.get("status", "up").lower()
            is_mismatch = status == "mismatch"
            is_down = status == "down"

            edge_label = ""
            if is_down:
                edge_label = "LINK DOWN / ADMIN SHUT"
            elif is_mismatch:
                edge_label = "NATIVE VLAN MISMATCH"
            elif edata.get("is_trunk"):
                edge_label = f"802.1Q TRUNK (Native {edata.get('native_vlan', 1)})"
            elif edata.get("link_type"):
                edge_label = f"{edata.get('link_type')}"

            stroke_color = "#38bdf8"
            if is_down:
                stroke_color = "#f43f5e"
            elif is_mismatch:
                stroke_color = "#fbbf24"

            edge_key = f"e-{u_id}-{v_id}"
            edges.append({
                "id": edge_key,
                "source": u_id,
                "target": v_id,
                "type": "ciscoEdge",
                "animated": status == "up",
                "label": edge_label,
                "labelStyle": {
                    "fill": stroke_color,
                    "fontWeight": 700,
                    "fontSize": 10,
                    "fontFamily": "monospace"
                },
                "labelBgStyle": {
                    "fill": "#090d16",
                    "fillOpacity": 0.95,
                    "stroke": stroke_color,
                    "strokeWidth": 1.5
                },
                "labelBgPadding": [6, 12],
                "labelBgBorderRadius": 8,
                "style": {
                    "stroke": stroke_color,
                    "strokeWidth": 3 if (is_down or is_mismatch) else 2,
                    "strokeDasharray": "8,6" if is_down else ("6,4" if is_mismatch else "none")
                },
                "data": edata
            })

        return {"nodes": nodes, "edges": edges}

    def apply_mutation(self, mutation: Dict[str, Any]) -> Dict[str, Any]:
        """Apply dynamic AI mutation command to network graph."""
        action = mutation.get("action", "").upper()
        
        if action == "ADD_DEVICE":
            dev_id = mutation.get("id") or mutation.get("device_id") or "NewDevice"
            dtype = mutation.get("type") or mutation.get("device_type") or "Router"
            x = mutation.get("x")
            y = mutation.get("y")
            self.add_device(dev_id, dtype, x=x, y=y)
            if mutation.get("ip"):
                ip_parts = mutation["ip"].split("/")
                ip_addr = ip_parts[0]
                mask = "255.255.255.0"
                self.add_interface(dev_id, "Gi0/1", ip_addr=ip_addr, subnet_mask=mask)
            return {"status": "success", "message": f"Added device {dev_id} ({dtype})"}

        elif action == "ADD_BACKUP_ROUTER":
            dev_id = "R2-Backup"
            self.add_device(dev_id, "Router", model="Cisco 4331", x=480, y=50)
            self.add_interface(dev_id, "Gi0/0/0", ip_addr="10.1.10.254", subnet_mask="255.255.255.0", vlan=10)
            self.add_interface(dev_id, "Gi0/0/1", ip_addr="10.1.20.254", subnet_mask="255.255.255.0", vlan=20)
            self.add_link(dev_id, "Gi0/0/0", "SW1", "Gi0/2", link_type="HSRP Standby (VLAN 10)")
            self.add_link(dev_id, "Gi0/0/1", "SW2", "Gi0/2", link_type="HSRP Standby (VLAN 20)")
            return {"status": "success", "message": "Deployed redundant router R2-Backup with dual HSRP uplinks to SW1 and SW2."}

        elif action == "REMOVE_DEVICE":
            dev_id = mutation.get("id") or mutation.get("device_id")
            if dev_id and self.graph.has_node(dev_id):
                self.graph.remove_node(dev_id)
                self.device_interfaces.pop(dev_id, None)
                return {"status": "success", "message": f"Removed device {dev_id}"}
            return {"status": "error", "message": f"Device {dev_id} not found"}

        elif action == "ADD_LINK":
            dev_a = mutation.get("dev_a") or mutation.get("source")
            dev_b = mutation.get("dev_b") or mutation.get("target")
            intf_a = mutation.get("intf_a", "Gi0/1")
            intf_b = mutation.get("intf_b", "Gi0/1")
            is_trunk = bool(mutation.get("is_trunk", False))
            native_vlan = int(mutation.get("native_vlan", 1))
            self.add_link(dev_a, intf_a, dev_b, intf_b, is_trunk=is_trunk, native_vlan=native_vlan)
            return {"status": "success", "message": f"Linked {dev_a} ({intf_a}) <-> {dev_b} ({intf_b})"}

        elif action == "REMOVE_LINK":
            dev_a = mutation.get("dev_a") or mutation.get("source")
            dev_b = mutation.get("dev_b") or mutation.get("target")
            removed = False
            for u, v, k in list(self.graph.edges(keys=True)):
                if (u.lower() == dev_a.lower() and v.lower() == dev_b.lower()) or (u.lower() == dev_b.lower() and v.lower() == dev_a.lower()):
                    self.graph.remove_edge(u, v, key=k)
                    removed = True
            return {"status": "success" if removed else "error", "message": f"Removed link between {dev_a} and {dev_b}"}

        elif action == "SET_LINK_STATUS":
            dev_a = mutation.get("dev_a") or mutation.get("source")
            dev_b = mutation.get("dev_b") or mutation.get("target")
            status = mutation.get("status", "up").lower()
            updated = False
            for u, v, k, d in self.graph.edges(data=True, keys=True):
                if (u.lower() == dev_a.lower() and v.lower() == dev_b.lower()) or (u.lower() == dev_b.lower() and v.lower() == dev_a.lower()):
                    d["status"] = status
                    updated = True
            return {"status": "success" if updated else "error", "message": f"Set link {dev_a}<->{dev_b} status to {status}"}

        elif action == "SIMULATE_FAIL":
            target = mutation.get("target", "trunk")
            for u, v, k, d in self.graph.edges(data=True, keys=True):
                if d.get("is_trunk") or target.lower() in f"{u} {v}".lower():
                    d["status"] = "down"
            return {"status": "success", "message": "Injected link failure on core transit path."}

        elif action == "AUTO_HEAL":
            for u, v, k, d in self.graph.edges(data=True, keys=True):
                d["status"] = "up"
                if d.get("is_trunk"):
                    d["native_vlan"] = 1
            for dev, intfs in self.device_interfaces.items():
                for iname, idata in intfs.items():
                    idata["status"] = "up"
                    if idata.get("is_trunk"):
                        idata["native_vlan"] = 1
            return {"status": "success", "message": "Self-healing executed: links restored to UP, VLANs synchronized to 1."}

        elif action == "AUTO_LAYOUT":
            layout_type = mutation.get("layout", "hierarchical")
            pos_map = calculate_relative_distances(self.graph, layout=layout_type)
            for nid, pos in pos_map.items():
                if self.graph.has_node(nid):
                    self.graph.nodes[nid]["x"] = pos["x"]
                    self.graph.nodes[nid]["y"] = pos["y"]
            return {"status": "success", "message": f"Auto-layout computed with relative distances ({layout_type})."}

        elif action == "BUILD_TOPOLOGY":
            nodes_input = mutation.get("nodes", [])
            links_input = mutation.get("links", [])
            layout_type = mutation.get("layout", "hierarchical")

            if not nodes_input:
                return {"status": "error", "message": "No nodes provided in BUILD_TOPOLOGY"}

            self.graph = nx.MultiGraph()
            self.device_interfaces = {}

            # Calculate relative distances for all input nodes
            pos_map = calculate_relative_distances(nodes_input, layout=layout_type)

            for nd in nodes_input:
                nid = nd.get("id") or nd.get("name") or "Device"
                ntype = nd.get("type") or nd.get("device_type") or "Router"
                pos = pos_map.get(nid, {"x": 200, "y": 200})
                if "x" in nd and "y" in nd:
                    pos = {"x": int(nd["x"]), "y": int(nd["y"])}
                
                self.add_device(nid, ntype, x=pos["x"], y=pos["y"])
                
                ip = nd.get("ip")
                vlan = nd.get("vlan")
                if ip:
                    ip_clean = ip.split("/")[0]
                    mask = "255.255.255.0"
                    self.add_interface(nid, "Fa0/1" if "host" in ntype.lower() else "Gi0/1", ip_addr=ip_clean, subnet_mask=mask, vlan=vlan)

            for lk in links_input:
                src = lk.get("source") or lk.get("dev_a")
                dst = lk.get("target") or lk.get("dev_b")
                if src and dst:
                    intf_a = lk.get("intf_a", "Gi0/1")
                    intf_b = lk.get("intf_b", "Gi0/1")
                    is_trunk = bool(lk.get("is_trunk", False))
                    native_vlan = int(lk.get("native_vlan", 1))
                    link_type = lk.get("link_type", "802.1Q Trunk" if is_trunk else "Ethernet")
                    self.add_link(src, intf_a, dst, intf_b, link_type=link_type, is_trunk=is_trunk, native_vlan=native_vlan)

            return {
                "status": "success",
                "message": f"Constructed requested {layout_type} topology: {len(nodes_input)} nodes, {len(links_input)} links."
            }

        elif action == "RESET":
            default_g = build_default_enterprise_topology(has_mismatch=True)
            self.graph = default_g.graph
            self.device_interfaces = default_g.device_interfaces
            return {"status": "success", "message": "Reset topology to baseline."}

        return {"status": "error", "message": f"Unknown action: {action}"}


def calculate_relative_distances(
    graph_or_nodes: Any, 
    links: Optional[List[Dict[str, Any]]] = None, 
    layout: str = "hierarchical"
) -> Dict[str, Dict[str, int]]:
    """
    Computes deterministic relative spatial coordinates (x, y) for network nodes with collision avoidance.
    Supports:
      1. 'hierarchical' (Enterprise 3-tier: Core Routers -> Distribution Switches -> Access Endpoints)
      2. 'star' / 'hub-and-spoke' (Central Core Switch/Router with radial equidistant satellites)
    """
    import math

    node_entries: List[Tuple[str, str]] = []
    if isinstance(graph_or_nodes, (nx.Graph, nx.MultiGraph)):
        for n, d in graph_or_nodes.nodes(data=True):
            if d.get("node_type") == "device":
                node_entries.append((n, d.get("device_type", "Router")))
    elif isinstance(graph_or_nodes, list):
        for item in graph_or_nodes:
            if isinstance(item, dict):
                nid = item.get("id") or item.get("name") or "Node"
                ntype = item.get("type") or item.get("device_type") or "Router"
                node_entries.append((nid, ntype))
            elif isinstance(item, str):
                node_entries.append((item, "Router"))

    if not node_entries:
        return {}

    positions: Dict[str, Dict[str, int]] = {}

    if layout.lower() in ["star", "hub-and-spoke", "hub_and_spoke"]:
        # Find central node (first router, or switch, or 0)
        hub_idx = 0
        for idx, (nid, ntype) in enumerate(node_entries):
            if "router" in ntype.lower() or "switch" in ntype.lower():
                hub_idx = idx
                break
        hub_id, _ = node_entries[hub_idx]
        positions[hub_id] = {"x": 500, "y": 260}

        satellites = [e for i, e in enumerate(node_entries) if i != hub_idx]
        num_sats = len(satellites)
        if num_sats > 0:
            radius = max(200, num_sats * 35)
            for i, (sat_id, _) in enumerate(satellites):
                angle = (2 * math.pi * i / num_sats) - (math.pi / 2)
                pos_x = int(500 + radius * math.cos(angle))
                pos_y = int(260 + radius * math.sin(angle))
                positions[sat_id] = {"x": pos_x, "y": pos_y}
        return positions

    # Hierarchical 3-tier layout:
    # Tier 0: Core / Routers (y = 80)
    # Tier 1: Distribution / Switches (y = 250)
    # Tier 2: Access Endpoints / Hosts / Servers (y = 430)
    routers = []
    switches = []
    endpoints = []

    for nid, ntype in node_entries:
        t_low = ntype.lower()
        if "router" in t_low or "gateway" in t_low:
            routers.append(nid)
        elif "switch" in t_low:
            switches.append(nid)
        else:
            endpoints.append(nid)

    tier_y_map = {
        "router": 80,
        "switch": 250,
        "endpoint": 430
    }
    if not routers:
        tier_y_map["switch"] = 120
        tier_y_map["endpoint"] = 320

    center_x = 500

    def layout_tier(nodes_in_tier: List[str], tier_y: int):
        k = len(nodes_in_tier)
        if k == 0:
            return
        spacing = 240 if k <= 4 else max(160, int(840 / k))
        total_width = (k - 1) * spacing
        start_x = center_x - (total_width // 2)
        for i, nid in enumerate(nodes_in_tier):
            px = max(80, start_x + (i * spacing))
            positions[nid] = {"x": px, "y": tier_y}

    layout_tier(routers, tier_y_map["router"])
    layout_tier(switches, tier_y_map["switch"])
    layout_tier(endpoints, tier_y_map["endpoint"])

    # Collision avoidance check (min separation: 160px)
    node_ids = list(positions.keys())
    for i in range(len(node_ids)):
        for j in range(i + 1, len(node_ids)):
            n1 = node_ids[i]
            n2 = node_ids[j]
            p1 = positions[n1]
            p2 = positions[n2]
            dx = p1["x"] - p2["x"]
            dy = p1["y"] - p2["y"]
            dist = (dx**2 + dy**2)**0.5
            if dist < 140:
                positions[n2]["x"] += int(160 - dist)

    return positions


def build_default_enterprise_topology(has_mismatch: bool = True) -> NetworkPropertyGraph:
    """Creates reference 4-node enterprise topology (Host-A -> SW1 -> SW2 -> Host-B)."""
    g = NetworkPropertyGraph("Enterprise-Core-VLAN")
    g.add_device("Host-A", "Host")
    g.add_device("SW1", "Switch")
    g.add_device("SW2", "Switch")
    g.add_device("Host-B", "Host")

    g.add_interface("Host-A", "Fa0", ip_addr="10.1.10.5", subnet_mask="255.255.255.0", vlan=10)
    g.add_interface("SW1", "Fa0/2", vlan=10)
    g.add_interface("SW1", "Gi0/1", is_trunk=True, native_vlan=1, allowed_vlans=[10, 20])

    sw2_native = 99 if has_mismatch else 1
    g.add_interface("SW2", "Gi0/1", is_trunk=True, native_vlan=sw2_native, allowed_vlans=[10, 20])
    g.add_interface("SW2", "Fa0/2", vlan=10)
    g.add_interface("Host-B", "Fa0", ip_addr="10.1.10.6", subnet_mask="255.255.255.0", vlan=10)

    g.add_link("Host-A", "Fa0", "SW1", "Fa0/2", link_type="Access", is_trunk=False)
    g.add_link(
        "SW1", "Gi0/1", "SW2", "Gi0/1", 
        link_type="802.1Q Trunk", 
        is_trunk=True, 
        native_vlan=1, 
        allowed_vlans=[10, 20]
    )
    if has_mismatch:
        for u, v, k, d in g.graph.edges(data=True, keys=True):
            if d.get("is_trunk"):
                d["status"] = "mismatch"

    g.add_link("SW2", "Fa0/2", "Host-B", "Fa0", link_type="Access", is_trunk=False)
    return g


def parse_topology_text_to_graph(text: str) -> NetworkPropertyGraph:
    """
    Constructs a NetworkPropertyGraph from parsed CDP neighbors or structured OCR discovery notes.
    """
    net_graph = NetworkPropertyGraph()

    # Match device links: "SW1 (Gi0/1) <--- Trunk ---> (Gi0/1) SW2"
    link_pattern = re.compile(
        r'([\w\-]+)\s*\(([^\)]+)\)\s*<[-=]+\s*([\w\-]+)?\s*[-=]+>\s*\(([^\)]+)\)\s*([\w\-]+)',
        re.IGNORECASE
    )
    for match in link_pattern.finditer(text):
        dev_a, intf_a, link_type, intf_b, dev_b = match.groups()
        is_trunk = bool(link_type and "trunk" in link_type.lower())
        net_graph.add_link(
            dev_a=dev_a,
            intf_a=intf_a,
            dev_b=dev_b,
            intf_b=intf_b,
            link_type=link_type or "Ethernet",
            is_trunk=is_trunk,
            allowed_vlans=[10, 20, 30] if is_trunk else [1]
        )

    # Match IP interface assignments: "Router0 Gi0/0: 192.168.1.1 255.255.255.0"
    ip_pattern = re.compile(
        r'([\w\-]+)\s+([A-Za-z0-9/]+)[:\s]+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
    )
    for match in ip_pattern.finditer(text):
        dev, intf, ip_addr, mask = match.groups()
        net_graph.add_interface(device_id=dev, interface_name=intf, ip_addr=ip_addr, subnet_mask=mask)

    # Match Host connection notes: "Host-A connected to SW1 Gi0/2 (VLAN 10)"
    host_pattern = re.compile(
        r'([\w\-]+)\s+connected to\s+([\w\-]+)\s+([A-Za-z0-9/]+)\s*\(VLAN\s*(\d+)\)',
        re.IGNORECASE
    )
    for match in host_pattern.finditer(text):
        host, switch, intf, vlan_str = match.groups()
        vlan_id = int(vlan_str)
        net_graph.add_device(host, device_type="Host")
        net_graph.add_device(switch, device_type="Switch")
        net_graph.add_link(dev_a=host, intf_a="Eth0", dev_b=switch, intf_b=intf)
        net_graph.add_interface(device_id=switch, interface_name=intf, vlan=vlan_id)

    return net_graph
