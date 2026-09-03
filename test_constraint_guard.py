import pytest
from constraint_guard import RemediationConstraintGuard

def test_verify_ip_assignment_valid():
    res = RemediationConstraintGuard.verify_ip_assignment(
        proposed_ip="192.168.1.10",
        proposed_mask="255.255.255.0",
        existing_subnets=["10.0.0.0/24", "172.16.0.0/16"]
    )
    assert res["valid"] is True
    assert res["prefix_length"] == 24
    assert len(res["errors"]) == 0

def test_verify_ip_assignment_reject_network_id():
    res = RemediationConstraintGuard.verify_ip_assignment(
        proposed_ip="192.168.1.0",
        proposed_mask="255.255.255.0",
        existing_subnets=[]
    )
    assert res["valid"] is False
    assert any("Network Identifier" in err for err in res["errors"])

def test_verify_ip_assignment_reject_broadcast_id():
    res = RemediationConstraintGuard.verify_ip_assignment(
        proposed_ip="192.168.1.255",
        proposed_mask="255.255.255.0",
        existing_subnets=[]
    )
    assert res["valid"] is False
    assert any("Broadcast Address" in err for err in res["errors"])

def test_verify_ip_assignment_reject_overlap():
    res = RemediationConstraintGuard.verify_ip_assignment(
        proposed_ip="10.0.1.1",
        proposed_mask="255.255.255.0",
        existing_subnets=["10.0.0.0/16"]
    )
    assert res["valid"] is False
    assert any("overlaps with existing topology subnet" in err for err in res["errors"])

def test_gateway_alignment_success():
    res = RemediationConstraintGuard.verify_gateway_alignment(
        host_ip="192.168.10.50",
        host_mask="255.255.255.0",
        gateway_ip="192.168.10.1"
    )
    assert res["valid"] is True

def test_gateway_alignment_mismatch():
    res = RemediationConstraintGuard.verify_gateway_alignment(
        host_ip="192.168.10.50",
        host_mask="255.255.255.0",
        gateway_ip="192.168.20.1"
    )
    assert res["valid"] is False
    assert "outside host subnet" in res["reason"]

def test_acl_shadowing_detection():
    rules = [
        "access-list 101 permit tcp any host 10.1.1.1 eq 22",
        "access-list 101 deny ip any any",
        "access-list 101 permit tcp any host 10.1.1.1 eq 80" # Shadowed!
    ]
    res = RemediationConstraintGuard.verify_acl_rule_ordering(rules)
    assert res["valid"] is False
    assert res["has_shadowing"] is True
    assert len(res["shadowed_rules"]) == 1
    assert res["shadowed_rules"][0]["line"] == 3

def test_ios_syntax_and_hallucination_check():
    cmds = [
        "interface GigabitEthernet0/1",
        "ip address 192.168.1.1 255.255.255.0",
        "no shutdown",
        "configure terminal route add 10.0.0.0 via eth0" # Hallucinated linux syntax
    ]
    res = RemediationConstraintGuard.verify_ios_syntax(cmds)
    assert res["valid"] is False
    assert res["valid_count"] == 3
    assert res["invalid_count"] == 1
    assert res["hallucination_rate"] == 0.25
