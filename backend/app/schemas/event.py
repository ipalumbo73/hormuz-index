from pydantic import BaseModel, field_validator
from datetime import datetime
from uuid import UUID
from typing import Optional

from app.services.parsing.normalizer import strip_html as _strip_html


class EventBase(BaseModel):
    title: str
    summary: str = ""
    category: str
    severity: float = 0.5
    confidence: float = 0.5
    novelty: float = 0.5
    actor_tags: list[str] = []
    country_tags: list[str] = []
    location_tags: list[str] = []
    signal_payload: dict = {}

class EventCreate(EventBase):
    source_id: UUID
    source_reliability: float = 0.7
    cluster_id: Optional[UUID] = None
    dedupe_hash: Optional[str] = None

class EventRead(EventBase):
    id: UUID
    cluster_id: Optional[UUID] = None
    timestamp_utc: datetime
    source_id: UUID
    source_reliability: float
    dedupe_hash: Optional[str] = None
    created_at: datetime
    article_url: Optional[str] = None
    model_config = {"from_attributes": True}

    @field_validator("title", "summary", mode="before")
    @classmethod
    def clean_html(cls, v: str) -> str:
        return _strip_html(v) if isinstance(v, str) else v

class EventListResponse(BaseModel):
    events: list[EventRead]
    total: int
    page: int
    page_size: int
