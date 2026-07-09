"""Alert state transitions: what to open, what to close, what to refresh.

Pure functions over the current indices and the set of rule keys that are already
active. The caller owns persistence; nothing here touches the database.
"""
from collections.abc import Iterable, Mapping
from dataclasses import dataclass

import structlog

from app.services.alerts.rules import (
    RULES_BY_KEY,
    AlertRule,
    build_payload,
    render_message,
)

logger = structlog.get_logger()


@dataclass(frozen=True)
class AlertTransitions:
    to_fire: tuple[dict, ...] = ()
    to_clear: tuple[str, ...] = ()
    to_refresh: tuple[dict, ...] = ()


def _should_clear(rule: AlertRule, indices: Mapping, scenario_probs: Mapping) -> bool:
    try:
        return rule.clear(indices, scenario_probs)
    except Exception as e:
        logger.warning("alert_clear_eval_error", rule=rule.key, error=str(e))
        return False


def _firing_rules(indices: Mapping, scenario_probs: Mapping) -> list[AlertRule]:
    firing = []
    for rule in RULES_BY_KEY.values():
        try:
            if rule.fire(indices, scenario_probs):
                firing.append(rule)
        except Exception as e:
            logger.warning("alert_fire_eval_error", rule=rule.key, error=str(e))
    return firing


def _outranked(rule: AlertRule, keys: Iterable[str]) -> bool:
    """True if some still-active rule in the same group ranks at or above `rule`."""
    return any(
        other.group == rule.group and other.rank >= rule.rank
        for other in (RULES_BY_KEY[k] for k in keys if k in RULES_BY_KEY)
    )


def evaluate_transitions(
    indices: Mapping,
    scenario_probs: Mapping,
    active_keys: frozenset[str],
) -> AlertTransitions:
    """Decide which alerts open, close, or keep running with a refreshed message."""
    to_clear = tuple(sorted(
        key for key in active_keys
        # A key with no matching rule is a leftover from a removed rule: retire it.
        if key not in RULES_BY_KEY or _should_clear(RULES_BY_KEY[key], indices, scenario_probs)
    ))
    remaining = active_keys - set(to_clear)

    candidates = [
        rule for rule in _firing_rules(indices, scenario_probs)
        if rule.key not in remaining and not _outranked(rule, remaining)
    ]
    # Within a group only the highest rank opens, so a jump from calm straight to
    # Critical does not also open Elevated.
    best_per_group: dict[str, AlertRule] = {}
    for rule in candidates:
        current = best_per_group.get(rule.group)
        if current is None or rule.rank > current.rank:
            best_per_group[rule.group] = rule

    payload = build_payload(indices, scenario_probs)

    to_fire = tuple(
        {
            "rule_key": rule.key,
            "level": rule.level,
            "title": rule.title,
            "message": render_message(rule, indices, scenario_probs),
            "trigger_type": "index_threshold",
            "trigger_payload": payload,
        }
        for rule in sorted(best_per_group.values(), key=lambda r: r.key)
    )

    to_refresh = tuple(
        {
            "rule_key": key,
            "message": render_message(RULES_BY_KEY[key], indices, scenario_probs),
            "trigger_payload": payload,
        }
        for key in sorted(remaining)
        if key in RULES_BY_KEY
    )

    return AlertTransitions(to_fire=to_fire, to_clear=to_clear, to_refresh=to_refresh)
