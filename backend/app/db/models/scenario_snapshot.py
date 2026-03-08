import uuid
from datetime import datetime
from sqlalchemy import Float, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class ScenarioSnapshot(Base):
    __tablename__ = "scenario_snapshots"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp_utc: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    contained_score: Mapped[float] = mapped_column(Float, default=40.0)
    regional_score: Mapped[float] = mapped_column(Float, default=25.0)
    threshold_score: Mapped[float] = mapped_column(Float, default=20.0)
    coercive_score: Mapped[float] = mapped_column(Float, default=10.0)
    actual_score: Mapped[float] = mapped_column(Float, default=5.0)
    contained_prob: Mapped[float] = mapped_column(Float, default=40.0)
    regional_prob: Mapped[float] = mapped_column(Float, default=25.0)
    threshold_prob: Mapped[float] = mapped_column(Float, default=20.0)
    coercive_prob: Mapped[float] = mapped_column(Float, default=10.0)
    actual_prob: Mapped[float] = mapped_column(Float, default=5.0)
    explanations: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
