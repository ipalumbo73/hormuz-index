from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update
from uuid import UUID
from typing import Optional
from app.db.session import get_db
from app.db.models import Alert
from app.schemas.alert import AlertRead, AlertListResponse

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=AlertListResponse)
async def list_alerts(
    level: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(Alert)
    count_query = select(func.count(Alert.id))

    if level:
        query = query.where(Alert.level == level)
        count_query = count_query.where(Alert.level == level)
    if acknowledged is not None:
        query = query.where(Alert.acknowledged == acknowledged)
        count_query = count_query.where(Alert.acknowledged == acknowledged)

    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(desc(Alert.timestamp_utc)).limit(limit)
    result = await db.execute(query)
    alerts = result.scalars().all()

    return AlertListResponse(
        alerts=[AlertRead.model_validate(a) for a in alerts],
        total=total,
    )


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: UUID, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = True
    return {"status": "acknowledged"}
