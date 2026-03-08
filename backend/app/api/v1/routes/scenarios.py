from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.db.models import ScenarioSnapshot
from app.schemas.scenario import ScenarioSnapshotRead, ScenarioHistoryResponse
from app.utils.dates import parse_range

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("/latest", response_model=ScenarioSnapshotRead)
async def get_latest_scenarios(db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    result = await db.execute(
        select(ScenarioSnapshot).order_by(desc(ScenarioSnapshot.timestamp_utc)).limit(1)
    )
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(status_code=404, detail="No scenario snapshots available")
    return ScenarioSnapshotRead.model_validate(snapshot)


@router.get("/history", response_model=ScenarioHistoryResponse)
async def get_scenario_history(
    range: str = Query("30d", regex=r"^\d+[hd]$"),
    db: AsyncSession = Depends(get_db),
):
    since = parse_range(range)
    result = await db.execute(
        select(ScenarioSnapshot)
        .where(ScenarioSnapshot.timestamp_utc >= since)
        .order_by(ScenarioSnapshot.timestamp_utc)
    )
    snapshots = result.scalars().all()
    return ScenarioHistoryResponse(
        snapshots=[ScenarioSnapshotRead.model_validate(s) for s in snapshots],
        range=range,
    )
