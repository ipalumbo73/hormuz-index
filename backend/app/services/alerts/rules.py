"""Alert rule evaluation engine.

Rules:
  NOI 50-69 => warning
  NOI 70-84 => high
  NOI >= 85 => critical
  GAI >= 70 => high
  HDI >= 75 => critical
  threshold_prob >= 35 => high
  coercive_prob >= 20 => high
  actual_prob >= 10 => critical
"""
import structlog

logger = structlog.get_logger()

ALERT_RULES = [
    {"condition": lambda idx, sc: 50 <= idx.get("NOI", 0) < 70, "level": "warning", "title": "NOI Elevated", "template": "Nuclear Opacity Index at {NOI:.1f} (Orange zone)"},
    {"condition": lambda idx, sc: 70 <= idx.get("NOI", 0) < 85, "level": "high", "title": "NOI High", "template": "Nuclear Opacity Index at {NOI:.1f} (Red zone)"},
    {"condition": lambda idx, sc: idx.get("NOI", 0) >= 85, "level": "critical", "title": "NOI Critical", "template": "Nuclear Opacity Index at {NOI:.1f} (Dark Red zone)"},
    {"condition": lambda idx, sc: idx.get("GAI", 0) >= 70, "level": "high", "title": "Gulf Attack Index High", "template": "Gulf Attack Index at {GAI:.1f}"},
    {"condition": lambda idx, sc: idx.get("HDI", 0) >= 75, "level": "critical", "title": "Hormuz Disruption Critical", "template": "Hormuz Disruption Index at {HDI:.1f}"},
    {"condition": lambda idx, sc: sc.get("threshold", 0) >= 35, "level": "high", "title": "Nuclear Threshold Scenario Elevated", "template": "Nuclear threshold crisis probability at {threshold:.1f}%"},
    {"condition": lambda idx, sc: sc.get("coercive", 0) >= 20, "level": "high", "title": "Coercive Nuclear Scenario Elevated", "template": "Coercive go-nuclear probability at {coercive:.1f}%"},
    {"condition": lambda idx, sc: sc.get("actual", 0) >= 10, "level": "critical", "title": "Nuclear Use Scenario Alert", "template": "Actual nuclear use probability at {actual:.1f}%"},
]


def evaluate_alerts(indices: dict, scenario_probs: dict) -> list[dict]:
    """Evaluate all alert rules against current indices and scenario probabilities.

    Returns list of alert dicts: {level, title, message, trigger_type, trigger_payload}
    """
    alerts = []
    merged = {**indices, **scenario_probs}

    for rule in ALERT_RULES:
        try:
            if rule["condition"](indices, scenario_probs):
                message = rule["template"].format(**merged)
                alerts.append({
                    "level": rule["level"],
                    "title": rule["title"],
                    "message": message,
                    "trigger_type": "index_threshold",
                    "trigger_payload": {
                        "indices": {k: round(v, 2) for k, v in indices.items() if isinstance(v, (int, float))},
                        "scenario_probs": {k: round(v, 2) for k, v in scenario_probs.items() if isinstance(v, (int, float))},
                    },
                })
        except Exception as e:
            logger.warning("alert_rule_eval_error", error=str(e))

    return alerts
