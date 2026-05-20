from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TouristLocationUpdate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class TouristLocationResponse(BaseModel):
    tourist_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    updated_at: Optional[datetime] = None
