from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from uuid import UUID
from typing import Optional
from app.db.session import get_db
from app.db.models import Source, TuningConfig
from app.db.models.alert import Alert
from app.core.config import settings
import structlog

VALID_SCENARIOS = {"contained", "regional", "threshold", "coercive", "actual"}
VALID_INDICES = {"NOI", "GAI", "HDI", "PAI", "SRI", "BSI", "DCI"}


class TuningConfigUpdate(BaseModel):
    priors: Optional[dict[str, float]] = None
    weights: Optional[dict[str, dict[str, float]]] = None
    thresholds: Optional[dict[str, float]] = None

    @field_validator("priors")
    @classmethod
    def validate_priors(cls, v):
        if v is None:
            return v
        for key, val in v.items():
            if key not in VALID_SCENARIOS:
                raise ValueError(f"Unknown scenario: {key}. Valid: {VALID_SCENARIOS}")
            if not isinstance(val, (int, float)) or val < 0:
                raise ValueError(f"Prior for {key} must be a non-negative number")
        return v

    @field_validator("weights")
    @classmethod
    def validate_weights(cls, v):
        if v is None:
            return v
        for idx_name, scenario_weights in v.items():
            if idx_name not in VALID_INDICES:
                raise ValueError(f"Unknown index: {idx_name}. Valid: {VALID_INDICES}")
            for sc_name, weight in scenario_weights.items():
                if sc_name not in VALID_SCENARIOS:
                    raise ValueError(f"Unknown scenario: {sc_name}. Valid: {VALID_SCENARIOS}")
                if not isinstance(weight, (int, float)):
                    raise ValueError(f"Weight for {idx_name}.{sc_name} must be a number")
        return v

logger = structlog.get_logger()


async def require_admin_key(x_admin_key: str = Header(None)):
    """Verify admin API key from X-Admin-Key header."""
    if not settings.ADMIN_API_KEY:
        raise HTTPException(status_code=503, detail="Admin access not configured")
    if x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")


router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin_key)])


@router.post("/seed")
async def seed_db(db: AsyncSession = Depends(get_db)):
    """Seed sources into database."""
    from app.core.seed import INITIAL_SOURCES
    from app.utils.dates import utcnow
    import uuid
    count = 0
    for src in INITIAL_SOURCES:
        existing = await db.execute(select(Source).where(Source.name == src["name"]))
        if existing.scalar_one_or_none():
            continue
        s = Source(id=uuid.uuid4(), **src, active=True, created_at=utcnow())
        db.add(s)
        count += 1
    await db.commit()
    return {"status": "seeded", "new_sources": count}


@router.post("/reingest")
async def reingest(db: AsyncSession = Depends(get_db)):
    """Trigger a manual re-ingestion cycle via Celery."""
    from app.services.tasks.collect_tasks import collect_gdelt, collect_newsdata, collect_rss
    collect_gdelt.delay()
    collect_newsdata.delay()
    collect_rss.delay()
    return {"status": "ingestion tasks queued"}


@router.post("/reingest-sync")
async def reingest_sync():
    """Run ingestion directly (no Celery needed). Returns when done."""
    from app.services.ingestion.gdelt_client import GDELTClient
    from app.services.ingestion.rss_client import RSSClient
    from app.services.tasks.collect_tasks import _process_and_store, _get_sync_session
    results = {}

    # GDELT
    try:
        client = GDELTClient()
        try:
            raw_items = await client.fetch_latest()
        finally:
            await client.close()
        session = _get_sync_session()
        try:
            count = _process_and_store(session, raw_items, default_source_type="structured")
            results["gdelt"] = {"fetched": len(raw_items), "stored": count}
        finally:
            session.close()
    except Exception as e:
        results["gdelt"] = {"error": str(e)}

    # RSS
    try:
        client = RSSClient()
        try:
            raw_items = await client.fetch_all()
        finally:
            await client.close()
        session = _get_sync_session()
        try:
            count = _process_and_store(session, raw_items, default_source_type="rss")
            results["rss"] = {"fetched": len(raw_items), "stored": count}
        finally:
            session.close()
    except Exception as e:
        results["rss"] = {"error": str(e)}

    return {"status": "done", "results": results}


@router.post("/recompute-indices")
async def recompute_indices(db: AsyncSession = Depends(get_db)):
    """Trigger manual recomputation of indices and scenarios."""
    from app.services.tasks.score_tasks import recompute_all
    recompute_all.delay()
    return {"status": "recompute task queued"}


@router.post("/recompute-sync")
async def recompute_sync():
    """Run index/scenario recomputation synchronously."""
    from app.services.tasks.score_tasks import recompute_all
    import asyncio
    import concurrent.futures
    try:
        with concurrent.futures.ThreadPoolExecutor() as pool:
            loop = asyncio.get_event_loop()
            result = await asyncio.wait_for(
                loop.run_in_executor(pool, recompute_all), timeout=300
            )
        return {"status": "done", "result": result}
    except asyncio.TimeoutError:
        return {"status": "error", "error": "recompute timed out after 300s"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.post("/source/{source_id}/toggle")
async def toggle_source(source_id: UUID, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    result = await db.execute(select(Source).where(Source.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    source.active = not source.active
    await db.commit()
    logger.info("source_toggled", source=source.name, active=source.active)
    return {"source": source.name, "active": source.active}


@router.post("/reset-tuning")
async def reset_tuning(db: AsyncSession = Depends(get_db)):
    """Reset tuning config to latest defaults (v1.1.0 calibrated)."""
    from app.core.seed import DEFAULT_TUNING
    import uuid
    # Deactivate old configs
    result = await db.execute(select(TuningConfig).where(TuningConfig.active == True))
    for old in result.scalars().all():
        old.active = False
    # Create new
    config = TuningConfig(
        id=uuid.uuid4(),
        version=DEFAULT_TUNING["version"],
        active=True,
        priors=DEFAULT_TUNING["priors"],
        weights=DEFAULT_TUNING["weights"],
        thresholds=DEFAULT_TUNING["thresholds"],
    )
    db.add(config)
    await db.commit()
    return {"status": "tuning reset", "version": DEFAULT_TUNING["version"]}


@router.post("/reclassify")
async def reclassify_events(db: AsyncSession = Depends(get_db)):
    """Re-classify all events with updated classifier severity values."""
    from app.db.models import Event
    from app.services.parsing.classifier import classify_event
    result = await db.execute(select(Event))
    events = result.scalars().all()
    updated = 0
    for ev in events:
        classification = classify_event(ev.title, ev.summary or "")
        if classification["category"] != "unclassified":
            ev.severity = classification["severity"]
            ev.confidence = classification["confidence"]
            ev.category = classification["category"]
            ev.signal_payload = classification.get("signal_payload", {})
            updated += 1
    await db.commit()
    return {"status": "reclassified", "events_updated": updated}


@router.post("/tuning-config/update")
async def update_tuning_config(
    payload: TuningConfigUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update the active tuning config (priors, weights, thresholds).

    Accepts partial updates — only provided fields are changed.
    Creates a new versioned config and deactivates the old one.
    """
    from app.core.seed import DEFAULT_TUNING
    import uuid

    # Get current active config
    result = await db.execute(select(TuningConfig).where(TuningConfig.active == True).limit(1))
    current = result.scalar_one_or_none()

    base_priors = current.priors if current else DEFAULT_TUNING["priors"]
    base_weights = current.weights if current else DEFAULT_TUNING["weights"]
    base_thresholds = current.thresholds if current else DEFAULT_TUNING["thresholds"]
    base_version = current.version if current else DEFAULT_TUNING["version"]

    # Merge updates
    new_priors = {**base_priors, **(payload.priors or {})}
    new_weights = base_weights.copy()
    for idx_name, scenario_weights in (payload.weights or {}).items():
        if idx_name in new_weights:
            new_weights[idx_name] = {**new_weights[idx_name], **scenario_weights}
        else:
            new_weights[idx_name] = scenario_weights
    new_thresholds = {**base_thresholds, **(payload.thresholds or {})}

    # Bump version (safe parsing)
    try:
        parts = base_version.split(".")
        parts[-1] = str(int(parts[-1]) + 1)
        new_version = ".".join(parts)
    except (ValueError, IndexError):
        new_version = "1.0.1"

    # Deactivate old
    if current:
        current.active = False

    # Create new config
    config = TuningConfig(
        id=uuid.uuid4(),
        version=new_version,
        active=True,
        priors=new_priors,
        weights=new_weights,
        thresholds=new_thresholds,
    )
    db.add(config)
    await db.commit()

    logger.info("tuning_config_updated", version=new_version)
    return {
        "status": "updated",
        "version": new_version,
        "priors": new_priors,
        "weights": new_weights,
        "thresholds": new_thresholds,
    }


@router.get("/tuning-config")
async def get_tuning_config(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TuningConfig).where(TuningConfig.active == True).limit(1)
    )
    config = result.scalar_one_or_none()
    if not config:
        return {"priors": {"contained": 40, "regional": 25, "threshold": 20, "coercive": 10, "actual": 5}, "weights": {}, "thresholds": {}}
    return {
        "id": str(config.id),
        "version": config.version,
        "priors": config.priors,
        "weights": config.weights,
        "thresholds": config.thresholds,
    }


@router.post("/alerts/deduplicate")
async def deduplicate_alerts(db: AsyncSession = Depends(get_db)):
    """Resolve duplicate active alerts, keeping only the most recent per title.

    The recompute task now closes alerts on its own, so this is a manual repair for
    duplicates left behind by earlier runs.
    """
    from app.utils.dates import utcnow

    result = await db.execute(
        select(Alert)
        .where(Alert.resolved_at.is_(None))
        .order_by(Alert.title, Alert.timestamp_utc.desc())
    )
    all_alerts = result.scalars().all()

    now = utcnow()
    seen_titles: set[str] = set()
    resolved = 0
    for a in all_alerts:
        if a.title in seen_titles:
            a.resolved_at = now
            resolved += 1
        else:
            seen_titles.add(a.title)
    await db.commit()
    return {"status": "deduplicated", "resolved": resolved, "remaining": len(seen_titles)}


@router.post("/alerts/acknowledge-all")
async def acknowledge_all_alerts(db: AsyncSession = Depends(get_db)):
    """Acknowledge all unacknowledged alerts."""
    result = await db.execute(
        select(Alert).where(Alert.acknowledged == False)
    )
    alerts = result.scalars().all()
    for a in alerts:
        a.acknowledged = True
    await db.commit()
    return {"status": "acknowledged", "count": len(alerts)}
