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


class TransportType(str, Enum):
    WALKING = "walking"
    BICYCLE = "bicycle"
    CAR = "car"


# ─── Keypoint (ugnjezden u Tour dokument) ────────────────────────

class KeypointCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200, description="Naziv ključne tačke (npr. Muzej, Park, Spomenik)")
    description: str = Field(min_length=1, max_length=2000, description="Detaljni opis ključne tačke")
    latitude: float = Field(ge=-90, le=90, description="Geografska širina (-90 do 90)")
    longitude: float = Field(ge=-180, le=180, description="Geografska dužina (-180 do 180)")
    image_url: str = Field(default="", max_length=1000, description="URL slike ključne tačke (opciono)")


class KeypointResponse(BaseModel):
    id: str
    name: str
    description: str
    latitude: float
    longitude: float
    image_url: str = ""


class KeypointUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, min_length=1, max_length=2000)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    image_url: Optional[str] = Field(default=None, max_length=1000)


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


class TourDuration(BaseModel):
    transport_type: TransportType
    minutes: int = Field(gt=0, description="Vreme obilaska ture u minutima")


class TourDurationsUpdate(BaseModel):
    durations: list[TourDuration] = Field(default_factory=list)


class TourResponse(BaseModel):
    id: str
    author_id: str
    title: str
    description: str
    difficulty: TourDifficulty
    tags: list[str] = Field(default_factory=list)
    status: TourStatus
    price: float
    distance_km: float = 0.0
    durations: list[TourDuration] = Field(default_factory=list)
    keypoints: list[KeypointResponse] = Field(default_factory=list)
    published_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class TourPublicResponse(BaseModel):
    id: str
    author_id: str
    title: str
    description: str
    difficulty: TourDifficulty
    tags: list[str] = Field(default_factory=list)
    status: TourStatus
    price: float
    distance_km: float = 0.0
    durations: list[TourDuration] = Field(default_factory=list)
    first_keypoint: Optional[KeypointResponse] = None
    published_at: Optional[datetime] = None
