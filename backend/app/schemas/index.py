from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class IndexValues(BaseModel):
    noi: float = 0.0
    gai: float = 0.0
    hdi: float = 0.0
    pai: float = 0.0
    sri: float = 0.0
    bsi: float = 0.0
    dci: float = 0.0

class NOIComponents(BaseModel):
    site_access_loss: float = 0.0
    material_knowledge_loss: float = 0.0
    enrichment_verification_gap: float = 0.0
    underground_activity_signal: float = 0.0
    technical_diplomatic_breakdown: float = 0.0
    conflicting_narratives_uncertainty: float = 0.0

class IndexSnapshotRead(IndexValues):
    id: UUID
    timestamp_utc: datetime
    noi_components: dict = {}
    window_24h: dict = {}
    window_7d: dict = {}
    window_30d: dict = {}
    created_at: datetime
    model_config = {"from_attributes": True}

class IndexHistoryResponse(BaseModel):
    snapshots: list[IndexSnapshotRead]
    range: str
