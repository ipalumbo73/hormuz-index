import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
from app.utils.dates import utcnow

class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp_utc: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    level: Mapped[str] = mapped_column(String(20))  # info, warning, high, critical
    title: Mapped[str] = mapped_column(Text)
    message: Mapped[str] = mapped_column(Text)
    trigger_type: Mapped[str] = mapped_column(String(50))
    trigger_payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    # Identifies the rule that opened this alert, so it can be closed when the
    # rule's clear condition holds. `acknowledged` means "a human saw it" and is
    # deliberately independent of `resolved_at`.
    rule_key: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
