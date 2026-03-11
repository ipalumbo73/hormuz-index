from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from uuid import UUID
from app.db.session import get_db
from app.db.models import Source, TuningConfig
from app.core.config import settings
import structlog

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
    import uuid
    from datetime import datetime
    count = 0
    for src in INITIAL_SOURCES:
        existing = await db.execute(select(Source).where(Source.name == src["name"]))
        if existing.scalar_one_or_none():
            continue
        s = Source(id=uuid.uuid4(), **src, active=True, created_at=datetime.utcnow())
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
    import concurrent.futures
    try:
        with concurrent.futures.ThreadPoolExecutor() as pool:
            import asyncio
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(pool, recompute_all)
        return {"status": "done", "result": result}
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
    payload: dict,
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
    new_priors = {**base_priors, **(payload.get("priors") or {})}
    new_weights = base_weights.copy()
    for idx_name, scenario_weights in (payload.get("weights") or {}).items():
        if idx_name in new_weights:
            new_weights[idx_name] = {**new_weights[idx_name], **scenario_weights}
        else:
            new_weights[idx_name] = scenario_weights
    new_thresholds = {**base_thresholds, **(payload.get("thresholds") or {})}

    # Bump version
    parts = base_version.split(".")
    parts[-1] = str(int(parts[-1]) + 1)
    new_version = ".".join(parts)

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
