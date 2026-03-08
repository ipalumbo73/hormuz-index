from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional

class SourceBase(BaseModel):
    name: str
    base_url: str
    source_type: str
    country: str = ""
    language: str = "en"
    tier: int = 2
    reliability_score: float = 0.7
    official_flag: bool = False
    active: bool = True
    rate_limit_per_hour: int = 60

class SourceCreate(SourceBase):
    pass

class SourceRead(SourceBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
