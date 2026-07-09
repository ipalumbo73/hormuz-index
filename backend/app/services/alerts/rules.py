"""Alert rule definitions.

Each rule declares a `fire` predicate and a `clear` predicate. `clear` is not the
negation of `fire`: it sits HYSTERESIS points below the fire threshold, so an index
oscillating around a boundary does not repeatedly re-open the alert. Every new alert
is dispatched to Telegram and Slack, so flapping means notification spam.

Rules sharing a `group` are mutually exclusive: only the highest-ranked one stays
active, so NOI never reports "High" and "Critical" at the same time. Upgrades
(High -> Critical) carry no hysteresis; only downgrades do.
"""
from collections.abc import Callable, Mapping
from dataclasses import dataclass

import structlog

logger = structlog.get_logger()

HYSTERESIS = 2.0


@dataclass(frozen=True)
class AlertRule:
    key: str
    group: str
    rank: int
    level: str
    title: str
    template: str
    fire: Callable[[Mapping, Mapping], bool]
    clear: Callable[[Mapping, Mapping], bool]


def _noi(idx: Mapping) -> float:
    return idx.get("NOI", 0)


ALERT_RULES: tuple[AlertRule, ...] = (
    AlertRule(
        key="noi_elevated", group="noi", rank=1, level="warning", title="NOI Elevated",
        template="Nuclear Opacity Index at {NOI:.1f} (Orange zone)",
        fire=lambda idx, sc: 50 <= _noi(idx) < 70,
        clear=lambda idx, sc: _noi(idx) < 50 - HYSTERESIS or _noi(idx) >= 70,
    ),
    AlertRule(
        key="noi_high", group="noi", rank=2, level="high", title="NOI High",
        template="Nuclear Opacity Index at {NOI:.1f} (Red zone)",
        fire=lambda idx, sc: 70 <= _noi(idx) < 85,
        clear=lambda idx, sc: _noi(idx) < 70 - HYSTERESIS or _noi(idx) >= 85,
    ),
    AlertRule(
        key="noi_critical", group="noi", rank=3, level="critical", title="NOI Critical",
        template="Nuclear Opacity Index at {NOI:.1f} (Dark Red zone)",
        fire=lambda idx, sc: _noi(idx) >= 85,
        clear=lambda idx, sc: _noi(idx) < 85 - HYSTERESIS,
    ),
    AlertRule(
        key="gai_high", group="gai", rank=1, level="high", title="Gulf Attack Index High",
        template="Gulf Attack Index at {GAI:.1f}",
        fire=lambda idx, sc: idx.get("GAI", 0) >= 70,
        clear=lambda idx, sc: idx.get("GAI", 0) < 70 - HYSTERESIS,
    ),
    AlertRule(
        key="hdi_critical", group="hdi", rank=1, level="critical", title="Hormuz Disruption Critical",
        template="Hormuz Disruption Index at {HDI:.1f}",
        fire=lambda idx, sc: idx.get("HDI", 0) >= 75,
        clear=lambda idx, sc: idx.get("HDI", 0) < 75 - HYSTERESIS,
    ),
    AlertRule(
        key="threshold_scenario", group="threshold", rank=1, level="high",
        title="Nuclear Threshold Scenario Elevated",
        template="Nuclear threshold crisis probability at {threshold:.1f}%",
        fire=lambda idx, sc: sc.get("threshold", 0) >= 35,
        clear=lambda idx, sc: sc.get("threshold", 0) < 35 - HYSTERESIS,
    ),
    AlertRule(
        key="coercive_scenario", group="coercive", rank=1, level="high",
        title="Coercive Nuclear Scenario Elevated",
        template="Coercive go-nuclear probability at {coercive:.1f}%",
        fire=lambda idx, sc: sc.get("coercive", 0) >= 20,
        clear=lambda idx, sc: sc.get("coercive", 0) < 20 - HYSTERESIS,
    ),
    AlertRule(
        key="actual_nuclear", group="actual", rank=1, level="critical",
        title="Nuclear Use Scenario Alert",
        template="Actual nuclear use probability at {actual:.1f}%",
        fire=lambda idx, sc: sc.get("actual", 0) >= 10,
        clear=lambda idx, sc: sc.get("actual", 0) < 10 - HYSTERESIS,
    ),
)

RULES_BY_KEY: dict[str, AlertRule] = {r.key: r for r in ALERT_RULES}

# Legacy rows predate `rule_key`; they are backfilled by title on startup.
TITLE_TO_KEY: dict[str, str] = {r.title: r.key for r in ALERT_RULES}


def build_payload(indices: Mapping, scenario_probs: Mapping) -> dict:
    return {
        "indices": {k: round(v, 2) for k, v in indices.items() if isinstance(v, (int, float))},
        "scenario_probs": {k: round(v, 2) for k, v in scenario_probs.items() if isinstance(v, (int, float))},
    }


def render_message(rule: AlertRule, indices: Mapping, scenario_probs: Mapping) -> str:
    return rule.template.format(**{**indices, **scenario_probs})


def evaluate_alerts(indices: dict, scenario_probs: dict) -> list[dict]:
    """Return the alerts whose fire condition currently holds, ignoring active state.

    Kept for callers that only need a stateless snapshot of firing rules.
    """
    alerts = []
    for rule in ALERT_RULES:
        try:
            if rule.fire(indices, scenario_probs):
                alerts.append({
                    "rule_key": rule.key,
                    "level": rule.level,
                    "title": rule.title,
                    "message": render_message(rule, indices, scenario_probs),
                    "trigger_type": "index_threshold",
                    "trigger_payload": build_payload(indices, scenario_probs),
                })
        except Exception as e:
            logger.warning("alert_rule_eval_error", rule=rule.key, error=str(e))

    return alerts
