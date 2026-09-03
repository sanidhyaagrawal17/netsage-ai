import pytest
from topology_graph import NetworkPropertyGraph, parse_topology_text_to_graph

def test_l2_reachability_pass():
    g = NetworkPropertyGraph()
    g.add_device("Host-A", "Host")
    g.add_device("SW1", "Switch")
    g.add_device("SW2", "Switch")
    g.add_device("Host-B", "Host")

    # Host-A -> SW1
    g.add_link("Host-A", "Eth0", "SW1", "Gi0/2")
    # SW1 -> SW2 (Trunk allowing VLAN 10)
    g.add_link("SW1", "Gi0/1", "SW2", "Gi0/1", is_trunk=True, allowed_vlans=[10, 20])
    # SW2 -> Host-B
    g.add_link("SW2", "Gi0/2", "Host-B", "Eth0")

    res = g.check_l2_reachability("Host-A", "Host-B", vlan_id=10)
    assert res["reachable"] is True
    assert res["hop_count"] == 3
    assert res["path"] == ["Host-A", "SW1", "SW2", "Host-B"]

def test_l2_reachability_vlan_blocked():
    g = NetworkPropertyGraph()
    g.add_device("Host-A", "Host")
    g.add_device("SW1", "Switch")
    g.add_device("SW2", "Switch")
    g.add_device("Host-B", "Host")

    g.add_link("Host-A", "Eth0", "SW1", "Gi0/2")
    # Trunk only allows VLAN 20, but test query is VLAN 10
    g.add_link("SW1", "Gi0/1", "SW2", "Gi0/1", is_trunk=True, allowed_vlans=[20])
    g.add_link("SW2", "Gi0/2", "Host-B", "Eth0")

    res = g.check_l2_reachability("Host-A", "Host-B", vlan_id=10)
    assert res["reachable"] is False
    assert "No continuous Layer-2 path" in res["reason"]

def test_native_vlan_mismatch():
    g = NetworkPropertyGraph()
    g.add_device("SW1", "Switch")
    g.add_device("SW2", "Switch")

    g.add_interface("SW1", "Gi0/1", is_trunk=True, native_vlan=1)
    g.add_interface("SW2", "Gi0/1", is_trunk=True, native_vlan=99)
    g.add_link("SW1", "Gi0/1", "SW2", "Gi0/1", is_trunk=True, native_vlan=1, allowed_vlans=[1, 10])

    res = g.check_l2_reachability("SW1", "SW2", vlan_id=10)
    assert res["reachable"] is False
    assert res.get("anomaly") == "NATIVE_VLAN_MISMATCH"

def test_l3_routed_reachability():
    g = NetworkPropertyGraph()
    # R1 connects to 10.1.1.0/24 (Gi0/0) and 192.168.1.0/24 (Gi0/1)
    g.add_interface("R1", "Gi0/0", ip_addr="10.1.1.1", subnet_mask="255.255.255.0")
    g.add_interface("R1", "Gi0/1", ip_addr="192.168.1.1", subnet_mask="255.255.255.0")

    res = g.check_l3_reachability("10.1.1.50", "192.168.1.100")
    assert res["reachable"] is True
    assert res["type"] == "Routed_InterSubnet"
    assert "R1" in res["routers"]

def test_l3_blackhole():
    g = NetworkPropertyGraph()
    # R1 only connects to 10.1.1.0/24
    g.add_interface("R1", "Gi0/0", ip_addr="10.1.1.1", subnet_mask="255.255.255.0")
    # R2 only connects to 192.168.1.0/24 (no link between R1 and R2)
    g.add_interface("R2", "Gi0/0", ip_addr="192.168.1.1", subnet_mask="255.255.255.0")

    res = g.check_l3_reachability("10.1.1.50", "192.168.1.100")
    assert res["reachable"] is False
    assert res.get("anomaly") == "ROUTING_BLACKHOLE"

def test_parse_topology_text():
    text = "SW1 (Gi0/1) <--- Trunk ---> (Gi0/1) SW2\nHost-A connected to SW1 Gi0/2 (VLAN 10)"
    g = parse_topology_text_to_graph(text)
    assert g.graph.has_node("SW1")
    assert g.graph.has_node("SW2")
    assert g.graph.has_node("Host-A")
