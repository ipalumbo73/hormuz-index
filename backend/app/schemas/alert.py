from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional

class AlertBase(BaseModel):
    level: str
    title: str
    message: str
    trigger_type: str
    trigger_payload: dict = {}

class AlertCreate(AlertBase):
    pass

class AlertRead(AlertBase):
    id: UUID
    timestamp_utc: datetime
    acknowledged: bool = False
    created_at: datetime
    model_config = {"from_attributes": True}

class AlertListResponse(BaseModel):
    alerts: list[AlertRead]
    total: int
