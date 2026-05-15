from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class TourDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class TourStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


# ─── Keypoint (ugnjezden u Tour dokument) ────────────────────────

class KeypointCreate(BaseModel):
    name: str
    description: str
    latitude: float
    longitude: float
    image_url: Optional[str] = None


class KeypointResponse(BaseModel):
    id: str
    name: str
    description: str
    latitude: float
    longitude: float
    image_url: Optional[str] = None


class KeypointUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None


# ─── Tour ────────────────────────────────────────────────────────

class TourCreate(BaseModel):
    title: str
    description: str
    difficulty: TourDifficulty
    tags: list[str] = Field(default_factory=list)


class TourUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[TourDifficulty] = None
    tags: Optional[list[str]] = None
    status: Optional[TourStatus] = None
    price: Optional[float] = None


class TourResponse(BaseModel):
    id: str
    author_id: str
    title: str
    description: str
    difficulty: TourDifficulty
    tags: list[str] = Field(default_factory=list)
    status: TourStatus
    price: float
    keypoints: list[KeypointResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
