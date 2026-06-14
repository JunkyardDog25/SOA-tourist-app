from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PositionCheck(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class KeypointVisitResponse(BaseModel):
    keypoint_id: str
    keypoint_name: str
    visited_at: datetime
    latitude: float
    longitude: float


class TourExecutionProgress(BaseModel):
    tour_id: str
    tourist_id: str
    total_keypoints: int
    visited_count: int
    completed: bool
    visits: list[KeypointVisitResponse] = Field(default_factory=list)
    newly_visited: list[str] = Field(default_factory=list)


class ManualVisitResponse(BaseModel):
    keypoint_id: str
    keypoint_name: str
    visited_at: datetime
    already_visited: bool = False
