import pytest
from checker import check_interface_status, check_subnet_mask, parse_cdp_neighbors

def test_check_interface_status():
    output = "GigabitEthernet0/1 is administratively down, line protocol is down"
    findings = check_interface_status(output)
    assert len(findings) > 0
    assert "administratively down" in findings[0].get("evidence_snippet", "") or "administratively down" in findings[0].get("description", "")

def test_check_subnet_mask():
    finding = check_subnet_mask("192.168.1.1", "255.255.255.0")
    assert finding is not None
    assert finding.get("valid") is True
    
    finding2 = check_subnet_mask("invalid", "255.255.255.0")
    assert finding2.get("valid") is False
    assert len(finding2.get("errors", [])) > 0

def test_parse_cdp_neighbors():
    output = "Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID\nRouter2          Gig 0/1           150             R    C2900     Gig 0/1"
    topo = parse_cdp_neighbors(output)
    assert "Router2" in topo
