from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class ScenarioProbabilities(BaseModel):
    contained_conflict: float = 40.0
    regional_war: float = 25.0
    nuclear_threshold_crisis: float = 20.0
    coercive_go_nuclear: float = 10.0
    actual_nuclear_use: float = 5.0

class ScenarioSnapshotRead(BaseModel):
    id: UUID
    timestamp_utc: datetime
    contained_score: float
    regional_score: float
    threshold_score: float
    coercive_score: float
    actual_score: float
    contained_prob: float
    regional_prob: float
    threshold_prob: float
    coercive_prob: float
    actual_prob: float
    explanations: dict = {}
    created_at: datetime
    model_config = {"from_attributes": True}

class ScenarioHistoryResponse(BaseModel):
    snapshots: list[ScenarioSnapshotRead]
    range: str
