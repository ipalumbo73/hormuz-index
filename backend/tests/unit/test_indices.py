"""Tests for risk index computation (event impact, subindices, rolling windows, CIs)."""
import pytest
from app.services.scoring.indices import (
    compute_event_impact,
    compute_subindex,
    _bootstrap_subindex,
    compute_all_indices,
    WINDOW_WEIGHTS,
)


def _event(signal_key="GAI", signal_val=50, reliability=1.0, confidence=1.0, severity=1.0, novelty=1.0):
    return {
        "source_reliability": reliability,
        "confidence": confidence,
        "severity": severity,
        "novelty": novelty,
        "signal_payload": {signal_key: signal_val},
    }


def test_event_impact_is_product_of_factors():
    ev = _event(reliability=0.8, confidence=0.5, severity=0.5, novelty=0.5)
    assert compute_event_impact(ev) == pytest.approx(0.8 * 0.5 * 0.5 * 0.5)


def test_event_impact_defaults():
    assert compute_event_impact({}) == pytest.approx(0.7 * 0.5 * 0.5 * 0.5)


def test_novelty_scales_impact():
    """A duplicate story (low novelty) must weigh less than a fresh one."""
    fresh = compute_event_impact(_event(novelty=1.0))
    echo = compute_event_impact(_event(novelty=0.25))
    assert echo == pytest.approx(fresh * 0.25)


def test_subindex_empty_events():
    assert compute_subindex([], "GAI") == 0.0


def test_subindex_is_weighted_average_bounded():
    events = [_event(signal_val=40), _event(signal_val=80)]
    val = compute_subindex(events, "GAI")
    assert 40 <= val <= 80  # weighted average stays within data range
    assert val == pytest.approx(60)  # equal impacts -> arithmetic mean


def test_subindex_weights_by_impact():
    strong = _event(signal_val=100, reliability=1.0, confidence=1.0, severity=1.0, novelty=1.0)
    weak = _event(signal_val=0.0001, reliability=0.1, confidence=0.1, severity=0.1, novelty=0.1)
    # Events with zero signal are excluded; near-zero signal with tiny impact
    # should barely move the average.
    val = compute_subindex([strong, weak], "GAI")
    assert val > 90


def test_subindex_ignores_other_signals():
    events = [_event(signal_key="HDI", signal_val=90)]
    assert compute_subindex(events, "GAI") == 0.0


def test_bootstrap_ci_brackets_value():
    events = [_event(signal_val=v) for v in [30, 40, 50, 60, 70, 55, 45]]
    result = _bootstrap_subindex(events, "GAI")
    assert result["ci_low"] <= result["value"] <= result["ci_high"]


def test_bootstrap_ci_widened_for_few_events():
    events = [_event(signal_val=50)]
    result = _bootstrap_subindex(events, "GAI")
    assert result["ci_high"] - result["ci_low"] >= 20  # analytic widening


def test_compute_all_indices_structure():
    events = [_event(signal_key=k, signal_val=50) for k in ["GAI", "HDI", "PAI", "SRI", "BSI", "DCI"]]
    result = compute_all_indices(events, events, events)
    for idx in ["NOI", "GAI", "HDI", "PAI", "SRI", "BSI", "DCI"]:
        assert idx in result
        assert 0 <= result[idx] <= 100
        assert idx in result["confidence_intervals"]
    assert "noi_components" in result
    assert "noi_level" in result


def test_rolling_window_weights_sum_to_one():
    assert sum(WINDOW_WEIGHTS.values()) == pytest.approx(1.0)


def test_rolling_window_formula():
    """Index = 0.50*24h + 0.30*7d + 0.20*30d with single-signal events."""
    e24 = [_event(signal_val=100)]
    e7 = [_event(signal_val=50)]
    e30 = [_event(signal_val=0.0)]  # zero-signal events are excluded -> window score 0
    result = compute_all_indices(e24, e7, e30)
    expected = 0.50 * 100 + 0.30 * 50 + 0.20 * 0
    assert result["GAI"] == pytest.approx(expected, abs=0.01)
