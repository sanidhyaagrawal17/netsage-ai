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

    def add_device(self, device_id: str, device_type: str = "Router", model: str = ""):
        """Register a network device node."""
        dev_id = device_id.strip()
        dtype = device_type.capitalize()
        self.graph.add_node(dev_id, node_type="device", device_type=dtype, model=model)
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
