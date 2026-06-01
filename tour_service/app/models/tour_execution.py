from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ExecutionStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class VisitedKeypoint(BaseModel):
    keypoint_id: str
    visited_at: datetime


class StartTourExecutionRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class CheckProximityRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class TourExecutionResponse(BaseModel):
    id: str
    tour_id: str
    tourist_id: str
    status: ExecutionStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    abandoned_at: Optional[datetime] = None
    last_activity_at: datetime
    start_latitude: float
    start_longitude: float
    visited_keypoints: list[VisitedKeypoint] = Field(default_factory=list)
    saga_id: Optional[str] = None


class ProximityCheckResponse(BaseModel):
    execution: TourExecutionResponse
    near_keypoint_id: Optional[str] = None
    newly_visited: bool = False
