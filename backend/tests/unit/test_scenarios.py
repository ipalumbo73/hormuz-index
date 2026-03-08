"""Tests for scenario probability computation."""
import pytest
from app.services.scoring.scenarios import compute_scenarios


def test_scenarios_base_priors():
    """With all indices at 0, probabilities should reflect base priors."""
    indices = {"NOI": 0, "GAI": 0, "HDI": 0, "PAI": 0, "SRI": 0, "BSI": 0, "DCI": 0}
    result = compute_scenarios(indices)

    probs = result["probabilities"]
    assert abs(sum(probs.values()) - 100.0) < 0.1
    assert probs["contained"] > probs["regional"]
    assert probs["regional"] > probs["threshold"]


def test_scenarios_high_noi_bsi_triggers_threshold():
    """NOI >= 70 and BSI >= 60 should trigger threshold +10."""
    indices = {"NOI": 75, "GAI": 0, "HDI": 0, "PAI": 0, "SRI": 0, "BSI": 65, "DCI": 0}
    result = compute_scenarios(indices)
    assert "NOI>=70_AND_BSI>=60" in result["triggers_fired"]


def test_scenarios_high_noi_sri_triggers_coercive():
    """NOI >= 80 and SRI >= 65 should trigger coercive +8."""
    indices = {"NOI": 85, "GAI": 0, "HDI": 0, "PAI": 0, "SRI": 70, "BSI": 0, "DCI": 0}
    result = compute_scenarios(indices)
    assert "NOI>=80_AND_SRI>=65" in result["triggers_fired"]


def test_scenarios_extreme_trigger():
    """NOI >= 85 and BSI >= 75 and SRI >= 75 should trigger actual +7."""
    indices = {"NOI": 90, "GAI": 0, "HDI": 0, "PAI": 0, "SRI": 80, "BSI": 80, "DCI": 0}
    result = compute_scenarios(indices)
    assert "NOI>=85_AND_BSI>=75_AND_SRI>=75" in result["triggers_fired"]


def test_scenarios_dci_reduces_extreme():
    """DCI >= 60 should reduce extreme scenarios by 15%."""
    indices = {"NOI": 50, "GAI": 50, "HDI": 50, "PAI": 50, "SRI": 50, "BSI": 50, "DCI": 65}
    result = compute_scenarios(indices)
    assert "DCI>=60_REDUCE_15PCT" in result["triggers_fired"]


def test_scenarios_probabilities_sum_to_100():
    """Probabilities should always sum to 100."""
    for noi in [0, 25, 50, 75, 100]:
        indices = {"NOI": noi, "GAI": noi, "HDI": 0, "PAI": 0, "SRI": 0, "BSI": 0, "DCI": 0}
        result = compute_scenarios(indices)
        total = sum(result["probabilities"].values())
        assert abs(total - 100.0) < 0.5, f"Probabilities sum to {total} for NOI={noi}"


def test_scenarios_explanations_present():
    """Each scenario should have explanations."""
    indices = {"NOI": 50, "GAI": 30, "HDI": 0, "PAI": 0, "SRI": 0, "BSI": 0, "DCI": 0}
    result = compute_scenarios(indices)
    for scenario in ["contained", "regional", "threshold", "coercive", "actual"]:
        assert scenario in result["explanations"]
