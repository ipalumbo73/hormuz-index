import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Article(Base):
    __tablename__ = "articles"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sources.id"))
    published_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    title: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text, unique=True)
    author: Mapped[str] = mapped_column(Text, nullable=True)
    language: Mapped[str] = mapped_column(String(10), default="en")
    raw_summary: Mapped[str] = mapped_column(Text, default="")
    raw_content: Mapped[str] = mapped_column(Text, nullable=True)
    hash: Mapped[str] = mapped_column(String(64))
    ingested_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
