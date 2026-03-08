from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.db.models import IndexSnapshot
from app.schemas.index import IndexSnapshotRead, IndexHistoryResponse
from app.utils.dates import parse_range

router = APIRouter(prefix="/indices", tags=["indices"])


@router.get("/latest", response_model=IndexSnapshotRead)
async def get_latest_indices(db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    result = await db.execute(
        select(IndexSnapshot).order_by(desc(IndexSnapshot.timestamp_utc)).limit(1)
    )
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(status_code=404, detail="No index snapshots available")
    return IndexSnapshotRead.model_validate(snapshot)


@router.get("/history", response_model=IndexHistoryResponse)
async def get_index_history(
    range: str = Query("7d", regex=r"^\d+[hd]$"),
    db: AsyncSession = Depends(get_db),
):
    since = parse_range(range)
    result = await db.execute(
        select(IndexSnapshot)
        .where(IndexSnapshot.timestamp_utc >= since)
        .order_by(IndexSnapshot.timestamp_utc)
    )
    snapshots = result.scalars().all()
    return IndexHistoryResponse(
        snapshots=[IndexSnapshotRead.model_validate(s) for s in snapshots],
        range=range,
    )
