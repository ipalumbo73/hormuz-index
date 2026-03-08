from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.v1.routes import events, indices, scenarios, alerts, sources, admin, dashboard, charts, explain
import app.db.models  # noqa: ensure models are registered

setup_logging()

import structlog
_logger = structlog.get_logger()
_logger.info("georisk-api starting", version="1.0.2")

app = FastAPI(
    title="GeoRisk Early Warning System",
    description="Geopolitical risk monitoring and scenario analysis for Iran-USA-Israel crisis",
    version="1.0.2",
)


@app.on_event("startup")
async def on_startup():
    from app.db.base import engine, Base
    _logger.info("on_startup: creating database tables")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        _logger.info("on_startup: tables created OK")
    except Exception as e:
        _logger.error("on_startup: FAILED", error=str(e))
    # Seed
    try:
        from sqlalchemy import create_engine as ce
        from sqlalchemy.orm import sessionmaker
        from app.core.seed import seed_sources
        se = ce(settings.DATABASE_URL_SYNC)
        S = sessionmaker(bind=se)
        db = S()
        seed_sources(db)
        db.close()
        se.dispose()
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


@app.get(f"{prefix}/health")
async def health():
    return {"status": "ok", "service": "georisk-api", "version": "1.0.2"}
