import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class TuningConfig(Base):
    __tablename__ = "tuning_configs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version: Mapped[str] = mapped_column(String(50))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    priors: Mapped[dict] = mapped_column(JSONB, default=dict)
    weights: Mapped[dict] = mapped_column(JSONB, default=dict)
    thresholds: Mapped[dict] = mapped_column(JSONB, default=dict)
    source_rules: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
