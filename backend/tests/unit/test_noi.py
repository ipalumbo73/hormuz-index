"""Tests for NOI (Nuclear Opacity Index) computation."""
import pytest
from app.services.scoring.noi import compute_noi


def test_noi_base_formula():
    """Test basic weighted formula."""
    components = {
        "site_access_loss": 50,
        "material_knowledge_loss": 50,
        "enrichment_verification_gap": 50,
        "underground_activity_signal": 50,
        "technical_diplomatic_breakdown": 50,
        "conflicting_narratives_uncertainty": 50,
    }
    result = compute_noi(components)
    assert result["noi"] == 50.0
    assert result["level"] == "orange"
    assert result["hard_rules_fired"] == []


def test_noi_all_zero():
    result = compute_noi({})
    assert result["noi"] == 0.0
    assert result["level"] == "green"


def test_noi_all_max():
    components = {
        "site_access_loss": 100,
        "material_knowledge_loss": 100,
        "enrichment_verification_gap": 100,
        "underground_activity_signal": 100,
        "technical_diplomatic_breakdown": 100,
        "conflicting_narratives_uncertainty": 100,
    }
    result = compute_noi(components)
    # 100 base + hard rule 1 (min 80, already above) + hard rule 2 (+5) + hard rule 3 (+3) = clamped 100
    assert result["noi"] == 100.0
    assert result["level"] == "dark_red"
    assert len(result["hard_rules_fired"]) == 3


def test_noi_hard_rule_1_minimum():
    """If A >= 75 and B >= 90, NOI min = 80."""
    components = {
        "site_access_loss": 75,
        "material_knowledge_loss": 90,
        "enrichment_verification_gap": 0,
        "underground_activity_signal": 0,
        "technical_diplomatic_breakdown": 0,
        "conflicting_narratives_uncertainty": 0,
    }
    result = compute_noi(components)
    # Base: 0.25*75 + 0.25*90 = 41.25, but hard rule forces min 80
    assert result["noi"] == 80.0
    assert "A>=75_AND_B>=90_MIN_80" in result["hard_rules_fired"]


def test_noi_hard_rule_2():
    """If C >= 75 and D >= 50, NOI += 5."""
    components = {
        "site_access_loss": 60,
        "material_knowledge_loss": 60,
        "enrichment_verification_gap": 80,
        "underground_activity_signal": 50,
        "technical_diplomatic_breakdown": 30,
        "conflicting_narratives_uncertainty": 30,
    }
    result = compute_noi(components)
    base = 0.25*60 + 0.25*60 + 0.20*80 + 0.10*50 + 0.10*30 + 0.10*30
    assert result["noi"] == round(base + 5, 2)
    assert "C>=75_AND_D>=50_PLUS_5" in result["hard_rules_fired"]


def test_noi_hard_rule_3():
    """If E >= 80 and F >= 70, NOI += 3."""
    components = {
        "site_access_loss": 30,
        "material_knowledge_loss": 30,
        "enrichment_verification_gap": 30,
        "underground_activity_signal": 30,
        "technical_diplomatic_breakdown": 80,
        "conflicting_narratives_uncertainty": 70,
    }
    result = compute_noi(components)
    base = 0.25*30 + 0.25*30 + 0.20*30 + 0.10*30 + 0.10*80 + 0.10*70
    assert result["noi"] == round(base + 3, 2)
    assert "E>=80_AND_F>=70_PLUS_3" in result["hard_rules_fired"]


def test_noi_levels():
    """Test all level thresholds."""
    assert compute_noi({"site_access_loss": 10})["level"] == "green"

    comps_yellow = {k: 40 for k in ["site_access_loss", "material_knowledge_loss", "enrichment_verification_gap", "underground_activity_signal", "technical_diplomatic_breakdown", "conflicting_narratives_uncertainty"]}
    assert compute_noi(comps_yellow)["level"] == "yellow"

    comps_orange = {k: 60 for k in comps_yellow}
    assert compute_noi(comps_orange)["level"] == "orange"

    comps_red = {k: 75 for k in comps_yellow}
    assert compute_noi(comps_red)["level"] == "red"


def test_noi_clamp_negative():
    """Test that negative values are clamped to 0."""
    components = {
        "site_access_loss": -10,
        "material_knowledge_loss": -10,
    }
    result = compute_noi(components)
    assert result["noi"] >= 0
