from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from uuid import UUID
from app.db.session import get_db
from app.db.models import Source, TuningConfig
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/admin", tags=["admin"])


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
    """Run ingestion synchronously (no Celery needed). Returns when done."""
    from app.services.tasks.collect_tasks import collect_gdelt, collect_rss
    results = {}
    try:
        results["gdelt"] = collect_gdelt()
    except Exception as e:
        results["gdelt"] = {"error": str(e)}
    try:
        results["rss"] = collect_rss()
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
    try:
        result = recompute_all()
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
