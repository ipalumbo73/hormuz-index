"""Tests for alert rule evaluation."""
import pytest
from app.services.alerts.rules import evaluate_alerts


def test_no_alerts_low_indices():
    indices = {"NOI": 10, "GAI": 10, "HDI": 10, "PAI": 10, "SRI": 10, "BSI": 10, "DCI": 10}
    scenario_probs = {"contained": 60, "regional": 20, "threshold": 10, "coercive": 5, "actual": 5}
    alerts = evaluate_alerts(indices, scenario_probs)
    assert len(alerts) == 0


def test_noi_warning():
    indices = {"NOI": 55, "GAI": 10, "HDI": 10, "PAI": 10, "SRI": 10, "BSI": 10, "DCI": 10}
    scenario_probs = {"contained": 60, "regional": 20, "threshold": 10, "coercive": 5, "actual": 5}
    alerts = evaluate_alerts(indices, scenario_probs)
    warning_alerts = [a for a in alerts if a["level"] == "warning"]
    assert len(warning_alerts) >= 1


def test_noi_critical():
    indices = {"NOI": 90, "GAI": 10, "HDI": 10, "PAI": 10, "SRI": 10, "BSI": 10, "DCI": 10}
    scenario_probs = {"contained": 60, "regional": 20, "threshold": 10, "coercive": 5, "actual": 5}
    alerts = evaluate_alerts(indices, scenario_probs)
    critical_alerts = [a for a in alerts if a["level"] == "critical"]
    assert len(critical_alerts) >= 1


def test_hdi_critical():
    indices = {"NOI": 10, "GAI": 10, "HDI": 80, "PAI": 10, "SRI": 10, "BSI": 10, "DCI": 10}
    scenario_probs = {"contained": 60, "regional": 20, "threshold": 10, "coercive": 5, "actual": 5}
    alerts = evaluate_alerts(indices, scenario_probs)
    assert any(a["title"] == "Hormuz Disruption Critical" for a in alerts)


def test_actual_nuclear_alert():
    indices = {"NOI": 10, "GAI": 10, "HDI": 10, "PAI": 10, "SRI": 10, "BSI": 10, "DCI": 10}
    scenario_probs = {"contained": 30, "regional": 20, "threshold": 20, "coercive": 15, "actual": 15}
    alerts = evaluate_alerts(indices, scenario_probs)
    assert any(a["title"] == "Nuclear Use Scenario Alert" for a in alerts)
