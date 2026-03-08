import uuid
from datetime import datetime
from sqlalchemy import String, Float, Boolean, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Source(Base):
    __tablename__ = "sources"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    base_url: Mapped[str] = mapped_column(Text)
    source_type: Mapped[str] = mapped_column(String(50))  # newswire, agency, government, aggregator, rss
    country: Mapped[str] = mapped_column(String(100), default="")
    language: Mapped[str] = mapped_column(String(10), default="en")
    tier: Mapped[int] = mapped_column(Integer, default=2)
    reliability_score: Mapped[float] = mapped_column(Float, default=0.7)
    official_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    rate_limit_per_hour: Mapped[int] = mapped_column(Integer, default=60)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
