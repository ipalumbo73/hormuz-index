"""Scoring tasks - recompute indices and scenarios periodically."""
import asyncio
import uuid
from datetime import datetime
from sqlalchemy import select, update
from app.services.tasks.celery_app import celery_app
from app.services.scoring.indices import compute_all_indices
from app.services.scoring.scenarios import compute_scenarios
from app.services.alerts.transitions import evaluate_transitions
from app.services.alerts.notifier import dispatch_alerts
from app.core.config import settings
from app.utils.dates import utcnow, hours_ago, days_ago
# Share the sync engine/pool with the collection tasks instead of building a
# separate engine per task invocation.
from app.services.tasks.collect_tasks import _get_sync_session
import structlog

logger = structlog.get_logger()


def _fetch_events_in_window(session, since: datetime) -> list[dict]:
    """Fetch events since a given datetime as dicts."""
    from app.db.models import Event
    events = session.execute(
        select(Event).where(Event.timestamp_utc >= since).order_by(Event.timestamp_utc.desc())
    ).scalars().all()

    return [
        {
            "source_reliability": e.source_reliability,
            "confidence": e.confidence,
            "severity": e.severity,
            "novelty": e.novelty,
            "signal_payload": e.signal_payload or {},
            "category": e.category,
            "actor_tags": e.actor_tags or [],
            "title": e.title,
        }
        for e in events
    ]


@celery_app.task(name="app.services.tasks.score_tasks.recompute_all")
def recompute_all():
    """Recompute all indices and scenarios, evaluate alerts."""
    logger.info("task_recompute_start")

    session = _get_sync_session()
    try:
        now = utcnow()
        events_24h = _fetch_events_in_window(session, hours_ago(24))
        events_7d = _fetch_events_in_window(session, days_ago(7))
        events_30d = _fetch_events_in_window(session, days_ago(30))

        # Compute indices
        indices = compute_all_indices(events_24h, events_7d, events_30d)

        # Check for active nuclear transfer signals in last 24h
        has_nuclear_transfer = any(
            e["category"] == "nuclear_transfer_signal" for e in events_24h
        )

        # Check for annihilation rhetoric in last 24h (stone age, obliterate, etc.)
        has_annihilation_rhetoric = any(
            e["category"] == "annihilation_rhetoric" for e in events_24h
        )

        # Load tuning config from DB (custom priors and weights)
        from app.db.models import TuningConfig
        tuning_result = session.execute(
            select(TuningConfig).where(TuningConfig.active == True).limit(1)
        )
        tuning = tuning_result.scalar_one_or_none()
        custom_priors = tuning.priors if tuning and tuning.priors else None
        custom_weights = tuning.weights if tuning and tuning.weights else None

        # Compute scenarios
        idx_values = {
            "NOI": indices["NOI"],
            "GAI": indices["GAI"],
            "HDI": indices["HDI"],
            "PAI": indices["PAI"],
            "SRI": indices["SRI"],
            "BSI": indices["BSI"],
            "DCI": indices["DCI"],
        }
        flags = {}
        if has_nuclear_transfer:
            flags["_nuclear_transfer_active"] = 1.0
            logger.warning("nuclear_transfer_signal_detected")
        if has_annihilation_rhetoric:
            flags["_annihilation_rhetoric_active"] = 1.0
            logger.warning("annihilation_rhetoric_detected")
        scenario_result = compute_scenarios(idx_values, custom_priors=custom_priors, custom_weights=custom_weights, flags=flags)

        # Persist index snapshot
        from app.db.models import IndexSnapshot, ScenarioSnapshot, Alert

        idx_snap = IndexSnapshot(
            id=uuid.uuid4(),
            timestamp_utc=now,
            noi=indices["NOI"],
            gai=indices["GAI"],
            hdi=indices["HDI"],
            pai=indices["PAI"],
            sri=indices["SRI"],
            bsi=indices["BSI"],
            dci=indices["DCI"],
            noi_components=indices.get("noi_components", {}),
            window_24h=indices.get("window_24h", {}),
            window_7d=indices.get("window_7d", {}),
            window_30d=indices.get("window_30d", {}),
        )
        session.add(idx_snap)

        # Persist scenario snapshot
        probs = scenario_result["probabilities"]
        scores = scenario_result["scores"]

        sc_snap = ScenarioSnapshot(
            id=uuid.uuid4(),
            timestamp_utc=now,
            contained_score=scores["contained"],
            regional_score=scores["regional"],
            threshold_score=scores["threshold"],
            coercive_score=scores["coercive"],
            actual_score=scores["actual"],
            contained_prob=probs["contained"],
            regional_prob=probs["regional"],
            threshold_prob=probs["threshold"],
            coercive_prob=probs["coercive"],
            actual_prob=probs["actual"],
            explanations={
                **scenario_result["explanations"],
                "confidence_intervals": scenario_result.get("confidence_intervals", {}),
            },
        )
        session.add(sc_snap)

        # Alert lifecycle: open the rules that just fired, close the ones whose
        # clear condition now holds, and refresh those still firing so their message
        # reports the current value rather than the one that triggered them.
        active_keys = frozenset(
            row[0] for row in session.execute(
                select(Alert.rule_key).where(
                    Alert.resolved_at.is_(None), Alert.rule_key.isnot(None)
                )
            ).all()
        )
        transitions = evaluate_transitions(idx_values, probs, active_keys)

        # Alerts predating rule_key can never be matched to a clear condition,
        # so they would stay active forever. Retire them.
        session.execute(
            update(Alert)
            .where(Alert.resolved_at.is_(None), Alert.rule_key.is_(None))
            .values(resolved_at=now)
        )

        if transitions.to_clear:
            session.execute(
                update(Alert)
                .where(Alert.resolved_at.is_(None), Alert.rule_key.in_(transitions.to_clear))
                .values(resolved_at=now)
            )

        for refresh in transitions.to_refresh:
            session.execute(
                update(Alert)
                .where(Alert.resolved_at.is_(None), Alert.rule_key == refresh["rule_key"])
                .values(message=refresh["message"], trigger_payload=refresh["trigger_payload"])
            )

        for alert_data in transitions.to_fire:
            session.add(Alert(
                id=uuid.uuid4(),
                timestamp_utc=now,
                rule_key=alert_data["rule_key"],
                level=alert_data["level"],
                title=alert_data["title"],
                message=alert_data["message"],
                trigger_type=alert_data["trigger_type"],
                trigger_payload=alert_data["trigger_payload"],
            ))

        session.commit()

        # Only newly opened alerts notify; refreshes and closures stay silent.
        alerts = list(transitions.to_fire)
        if alerts:
            asyncio.run(dispatch_alerts(alerts))

        logger.info("task_recompute_done",
                    noi=indices["NOI"], gai=indices["GAI"],
                    events_24h=len(events_24h), alerts=len(alerts))

        return {
            "indices": idx_values,
            "scenario_probs": probs,
            "alerts_generated": len(alerts),
        }

    except Exception as e:
        session.rollback()
        logger.error("task_recompute_error", error=str(e))
        raise
    finally:
        session.close()
