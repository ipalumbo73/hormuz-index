from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.v1.routes import events, indices, scenarios, alerts, sources, admin, dashboard, charts, explain
import app.db.models  # noqa: ensure models are registered

setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.db.base import engine
    yield
    await engine.dispose()


app = FastAPI(
    title="GeoRisk Early Warning System",
    description="Geopolitical risk monitoring and scenario analysis for Iran-USA-Israel crisis",
    version="1.0.0",
    lifespan=lifespan,
)

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
    return {"status": "ok", "service": "georisk-api"}
