from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.v1.routes import events, indices, scenarios, alerts, sources, admin, dashboard, charts, explain, briefing
import app.db.models  # noqa: ensure models are registered

setup_logging()

import structlog
_logger = structlog.get_logger()
_logger.info("georisk-api starting", version="1.1.0")

app = FastAPI(
    title="GeoRisk Early Warning System",
    description="Geopolitical risk monitoring and scenario analysis for Iran-USA-Israel crisis",
    version="1.1.0",
)

# Indexes for hot query paths. create_all only adds indexes on brand-new
# tables, so they are also created explicitly for pre-existing deployments.
_STARTUP_INDEXES = (
    "CREATE INDEX IF NOT EXISTS ix_events_timestamp_utc ON events (timestamp_utc)",
    "CREATE INDEX IF NOT EXISTS ix_events_category ON events (category)",
    "CREATE INDEX IF NOT EXISTS ix_events_dedupe_hash ON events (dedupe_hash)",
    "CREATE INDEX IF NOT EXISTS ix_alerts_timestamp_utc ON alerts (timestamp_utc)",
    "CREATE INDEX IF NOT EXISTS ix_alerts_acknowledged ON alerts (acknowledged)",
    "CREATE INDEX IF NOT EXISTS ix_index_snapshots_timestamp_utc ON index_snapshots (timestamp_utc)",
    "CREATE INDEX IF NOT EXISTS ix_scenario_snapshots_timestamp_utc ON scenario_snapshots (timestamp_utc)",
    "CREATE INDEX IF NOT EXISTS ix_articles_published_at ON articles (published_at)",
    "CREATE INDEX IF NOT EXISTS ix_event_clusters_last_seen_at ON event_clusters (last_seen_at)",
)


@app.on_event("startup")
async def on_startup():
    from sqlalchemy import text
    from app.db.base import engine, Base
    _logger.info("on_startup: creating database tables")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            for ddl in _STARTUP_INDEXES:
                await conn.execute(text(ddl))
        _logger.info("on_startup: tables and indexes created OK")
    except Exception as e:
        _logger.error("on_startup: FAILED", error=str(e))
    # Seed
    try:
        from app.core.seed import seed_database
        seed_database()
        _logger.info("on_startup: sources seeded")
    except Exception as e:
        _logger.warning("on_startup: seed skipped", error=str(e))


@app.on_event("shutdown")
async def on_shutdown():
    from app.db.base import engine
    await engine.dispose()


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
prefix = settings.API_PREFIX
app.include_router(events.router, prefix=prefix)
app.include_router(indices.router, prefix=prefix)
app.include_router(scenarios.router, prefix=prefix)
app.include_router(alerts.router, prefix=prefix)
app.include_router(sources.router, prefix=prefix)
app.include_router(admin.router, prefix=prefix)
app.include_router(dashboard.router, prefix=prefix)
app.include_router(charts.router, prefix=prefix)
app.include_router(explain.router, prefix=prefix)
app.include_router(briefing.router, prefix=prefix)


@app.get(f"{prefix}/health")
async def health():
    return {"status": "ok", "service": "georisk-api", "version": "1.1.0"}


@app.get(f"{prefix}/health/detailed")
async def health_detailed():
    """Deep health check: DB reachability and freshness of the scoring pipeline."""
    from sqlalchemy import select, desc, text
    from app.db.base import async_session
    from app.db.models import IndexSnapshot
    from app.utils.dates import utcnow

    checks: dict = {"database": "error", "last_snapshot_age_minutes": None}
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
            checks["database"] = "ok"
            result = await session.execute(
                select(IndexSnapshot.timestamp_utc)
                .order_by(desc(IndexSnapshot.timestamp_utc))
                .limit(1)
            )
            last_ts = result.scalar_one_or_none()
            if last_ts:
                checks["last_snapshot_age_minutes"] = round(
                    (utcnow() - last_ts).total_seconds() / 60, 1
                )
    except Exception as e:
        checks["error"] = str(e)

    # Pipeline is considered stale when no snapshot landed for over an hour
    # (the recompute task runs every RECOMPUTE_INTERVAL seconds, default 10 min).
    stale = (
        checks["last_snapshot_age_minutes"] is None
        or checks["last_snapshot_age_minutes"] > 60
    )
    status = "ok" if checks["database"] == "ok" and not stale else "degraded"
    return {"status": status, "service": "georisk-api", "version": "1.1.0", **checks}
