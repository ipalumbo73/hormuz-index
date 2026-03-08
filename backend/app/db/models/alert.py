import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp_utc: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    level: Mapped[str] = mapped_column(String(20))  # info, warning, high, critical
    title: Mapped[str] = mapped_column(Text)
    message: Mapped[str] = mapped_column(Text)
    trigger_type: Mapped[str] = mapped_column(String(50))
    trigger_payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
