"""Tests for scenario probability computation."""
import pytest
from app.services.scoring.scenarios import compute_scenarios, SCENARIOS, PRIORS


def test_scenarios_base_priors():
    """With all indices at 0, probabilities should reflect base priors."""
    indices = {"NOI": 0, "GAI": 0, "HDI": 0, "PAI": 0, "SRI": 0, "BSI": 0, "DCI": 0}
    result = compute_scenarios(indices)

    probs = result["probabilities"]
    assert abs(sum(probs.values()) - 100.0) < 0.1
    assert probs["contained"] > probs["regional"]
    assert probs["regional"] > probs["threshold"]


def test_scenarios_noi_bsi_triggers_threshold():
    """NOI >= 60 and BSI >= 55 should fire the threshold trigger."""
    indices = {"NOI": 75, "GAI": 0, "HDI": 0, "PAI": 0, "SRI": 0, "BSI": 65, "DCI": 0}
    result = compute_scenarios(indices)
    assert "NOI>=60_AND_BSI>=55_THRESHOLD" in result["triggers_fired"]


def test_scenarios_sri_bsi_triggers_coercive():
    """SRI >= 65 and BSI >= 60 should fire the coercive trigger."""
    indices = {"NOI": 0, "GAI": 0, "HDI": 0, "PAI": 0, "SRI": 70, "BSI": 65, "DCI": 0}
    result = compute_scenarios(indices)
    assert "SRI>=65_AND_BSI>=60_COERCIVE" in result["triggers_fired"]


def test_scenarios_extreme_trigger():
    """SRI>=85, BSI>=80, GAI>=85, DCI<=25 should fire the actual-use trigger."""
    indices = {"NOI": 0, "GAI": 90, "HDI": 0, "PAI": 0, "SRI": 90, "BSI": 85, "DCI": 10}
    result = compute_scenarios(indices)
    assert "SRI>=85_AND_BSI>=80_AND_GAI>=85_AND_DCI<=25_ACTUAL" in result["triggers_fired"]


def test_scenarios_dci_dampens_escalation():
    """DCI >= 65 should fire the diplomacy dampen trigger and reduce escalation."""
    base = {"NOI": 50, "GAI": 50, "HDI": 50, "PAI": 50, "SRI": 50, "BSI": 50, "DCI": 0}
    high_dci = {**base, "DCI": 70}

    result = compute_scenarios(high_dci)
    assert "DCI>=65_REDUCE_10PCT" in result["triggers_fired"]

    base_probs = compute_scenarios(base)["probabilities"]
    damped_probs = result["probabilities"]
    # Active diplomacy must lower regional-war probability and raise containment.
    assert damped_probs["regional"] < base_probs["regional"]
    assert damped_probs["contained"] > base_probs["contained"]


def test_scenarios_nuclear_transfer_flag():
    """The nuclear-transfer flag should fire its trigger and boost nuclear scenarios."""
    indices = {"NOI": 30, "GAI": 30, "HDI": 0, "PAI": 0, "SRI": 30, "BSI": 30, "DCI": 30}
    without = compute_scenarios(indices)
    with_flag = compute_scenarios(indices, flags={"_nuclear_transfer_active": 1.0})
    assert "NUCLEAR_TRANSFER_ACTIVE" in with_flag["triggers_fired"]
    assert with_flag["probabilities"]["threshold"] > without["probabilities"]["threshold"]
    assert with_flag["probabilities"]["actual"] > without["probabilities"]["actual"]


def test_scenarios_annihilation_rhetoric_flag():
    """Annihilation rhetoric + high SRI + diplomatic collapse boosts extreme scenarios."""
    indices = {"NOI": 0, "GAI": 0, "HDI": 0, "PAI": 0, "SRI": 85, "BSI": 0, "DCI": 10}
    result = compute_scenarios(indices, flags={"_annihilation_rhetoric_active": 1.0})
    assert "ANNIHILATION_RHETORIC_AND_DIPLO_COLLAPSE" in result["triggers_fired"]


def test_scenarios_probabilities_sum_to_100():
    """Probabilities should always sum to 100."""
    for noi in [0, 25, 50, 75, 100]:
        indices = {"NOI": noi, "GAI": noi, "HDI": 0, "PAI": 0, "SRI": 0, "BSI": 0, "DCI": 0}
        result = compute_scenarios(indices)
        total = sum(result["probabilities"].values())
        assert abs(total - 100.0) < 0.5, f"Probabilities sum to {total} for NOI={noi}"


def test_scenarios_custom_priors_respected():
    """Custom priors from the tuning config must override module defaults."""
    indices = {"NOI": 0, "GAI": 0, "HDI": 0, "PAI": 0, "SRI": 0, "BSI": 0, "DCI": 0}
    custom = {**PRIORS, "contained": 90.0}
    result = compute_scenarios(indices, custom_priors=custom)
    default = compute_scenarios(indices)
    assert result["probabilities"]["contained"] > default["probabilities"]["contained"]


def test_scenarios_confidence_intervals_present_and_ordered():
    """Monte Carlo CIs must exist for every scenario with p5 <= median <= p95."""
    indices = {"NOI": 40, "GAI": 55, "HDI": 20, "PAI": 35, "SRI": 45, "BSI": 30, "DCI": 25}
    result = compute_scenarios(indices)
    ci = result["confidence_intervals"]
    for s in SCENARIOS:
        assert s in ci
        assert ci[s]["p5"] <= ci[s]["median"] <= ci[s]["p95"]


def test_scenarios_explanations_present():
    """Each scenario should have explanations."""
    indices = {"NOI": 50, "GAI": 30, "HDI": 0, "PAI": 0, "SRI": 0, "BSI": 0, "DCI": 0}
    result = compute_scenarios(indices)
    for scenario in ["contained", "regional", "threshold", "coercive", "actual"]:
        assert scenario in result["explanations"]
