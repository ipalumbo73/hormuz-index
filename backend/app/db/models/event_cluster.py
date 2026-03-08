import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class EventCluster(Base):
    __tablename__ = "event_clusters"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_key: Mapped[str] = mapped_column(Text, unique=True)
    canonical_title: Mapped[str] = mapped_column(Text)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    event_category: Mapped[str] = mapped_column(String(100))
    actor_tags: Mapped[dict] = mapped_column(JSONB, default=list)
    country_tags: Mapped[dict] = mapped_column(JSONB, default=list)
    location_tags: Mapped[dict] = mapped_column(JSONB, default=list)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    source_count: Mapped[int] = mapped_column(Integer, default=1)
    article_count: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="active")
