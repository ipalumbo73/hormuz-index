import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Event(Base):
    __tablename__ = "events"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("event_clusters.id"), nullable=True)
    timestamp_utc: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sources.id"))
    source_reliability: Mapped[float] = mapped_column(Float, default=0.7)
    title: Mapped[str] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(100))
    severity: Mapped[float] = mapped_column(Float, default=0.5)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    novelty: Mapped[float] = mapped_column(Float, default=0.5)
    actor_tags: Mapped[dict] = mapped_column(JSONB, default=list)
    country_tags: Mapped[dict] = mapped_column(JSONB, default=list)
    location_tags: Mapped[dict] = mapped_column(JSONB, default=list)
    signal_payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    dedupe_hash: Mapped[str] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
