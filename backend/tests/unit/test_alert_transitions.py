"""Tests for alert fire/clear transitions with hysteresis."""
from app.services.alerts.transitions import evaluate_transitions

LOW = {"NOI": 10, "GAI": 10, "HDI": 10, "PAI": 10, "SRI": 10, "BSI": 10, "DCI": 10}
CALM = {"contained": 60, "regional": 20, "threshold": 10, "coercive": 5, "actual": 5}


def _indices(**overrides):
    return {**LOW, **overrides}


def _keys(alerts):
    return {a["rule_key"] for a in alerts}


def test_fires_when_threshold_crossed():
    t = evaluate_transitions(_indices(NOI=90), CALM, active_keys=frozenset())
    assert _keys(t.to_fire) == {"noi_critical"}
    assert t.to_clear == ()


def test_does_not_refire_an_already_active_rule():
    t = evaluate_transitions(_indices(NOI=90), CALM, active_keys=frozenset({"noi_critical"}))
    assert t.to_fire == ()
    assert t.to_clear == ()


def test_clears_when_index_falls_below_hysteresis_band():
    # NOI Critical fires at >= 85, clears only below 83.
    t = evaluate_transitions(_indices(NOI=82.9), CALM, active_keys=frozenset({"noi_critical"}))
    assert "noi_critical" in t.to_clear


def test_hysteresis_holds_alert_inside_the_dead_band():
    # 84 is below the 85 fire threshold but above the 83 clear threshold.
    t = evaluate_transitions(_indices(NOI=84), CALM, active_keys=frozenset({"noi_critical"}))
    assert t.to_clear == ()


def test_no_duplicate_noi_alerts_inside_the_dead_band():
    # While Critical is held by hysteresis, High must not also fire.
    t = evaluate_transitions(_indices(NOI=84), CALM, active_keys=frozenset({"noi_critical"}))
    assert t.to_fire == ()


def test_downgrade_swaps_critical_for_high_in_one_step():
    t = evaluate_transitions(_indices(NOI=82), CALM, active_keys=frozenset({"noi_critical"}))
    assert "noi_critical" in t.to_clear
    assert _keys(t.to_fire) == {"noi_high"}


def test_upgrade_has_no_hysteresis_delay():
    # Rising past 85 must clear High and fire Critical immediately.
    t = evaluate_transitions(_indices(NOI=86), CALM, active_keys=frozenset({"noi_high"}))
    assert "noi_high" in t.to_clear
    assert _keys(t.to_fire) == {"noi_critical"}


def test_clears_everything_when_indices_return_to_calm():
    t = evaluate_transitions(LOW, CALM, active_keys=frozenset({"noi_high", "hdi_critical"}))
    assert set(t.to_clear) == {"noi_high", "hdi_critical"}
    assert t.to_fire == ()


def test_refresh_carries_the_current_value_not_the_trigger_value():
    # The stale-message bug: an alert fired at 88.5 must not keep reporting 88.5.
    t = evaluate_transitions(_indices(NOI=84), CALM, active_keys=frozenset({"noi_critical"}))
    refreshed = {r["rule_key"]: r["message"] for r in t.to_refresh}
    assert "84.0" in refreshed["noi_critical"]
    assert "88.5" not in refreshed["noi_critical"]


def test_scenario_rules_clear_with_hysteresis():
    probs = {**CALM, "actual": 8.5}
    t = evaluate_transitions(LOW, probs, active_keys=frozenset({"actual_nuclear"}))
    assert t.to_clear == ()  # fires at 10, clears below 8

    probs = {**CALM, "actual": 7.9}
    t = evaluate_transitions(LOW, probs, active_keys=frozenset({"actual_nuclear"}))
    assert "actual_nuclear" in t.to_clear


def test_unknown_legacy_rule_key_is_cleared():
    t = evaluate_transitions(LOW, CALM, active_keys=frozenset({"some_removed_rule"}))
    assert "some_removed_rule" in t.to_clear


def test_never_fires_two_rules_of_the_same_group():
    for noi in (49, 55, 69, 70, 84, 85, 95):
        t = evaluate_transitions(_indices(NOI=noi), CALM, active_keys=frozenset())
        groups = [k.split("_")[0] for k in _keys(t.to_fire)]
        assert len(groups) == len(set(groups)), f"duplicate group at NOI={noi}"
