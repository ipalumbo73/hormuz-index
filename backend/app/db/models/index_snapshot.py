import uuid
from datetime import datetime
from sqlalchemy import Float, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class IndexSnapshot(Base):
    __tablename__ = "index_snapshots"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp_utc: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    noi: Mapped[float] = mapped_column(Float, default=0.0)
    gai: Mapped[float] = mapped_column(Float, default=0.0)
    hdi: Mapped[float] = mapped_column(Float, default=0.0)
    pai: Mapped[float] = mapped_column(Float, default=0.0)
    sri: Mapped[float] = mapped_column(Float, default=0.0)
    bsi: Mapped[float] = mapped_column(Float, default=0.0)
    dci: Mapped[float] = mapped_column(Float, default=0.0)
    noi_components: Mapped[dict] = mapped_column(JSONB, default=dict)
    window_24h: Mapped[dict] = mapped_column(JSONB, default=dict)
    window_7d: Mapped[dict] = mapped_column(JSONB, default=dict)
    window_30d: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
