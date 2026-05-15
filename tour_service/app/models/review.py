from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date


class ReviewCreate(BaseModel):
    tour_id: str
    rating: int = Field(ge=1, le=5, description="Ocena od 1 do 5")
    comment: str
    visit_date: date
    images: list[str] = []


class ReviewResponse(BaseModel):
    id: str
    tour_id: str
    tourist_id: int
    tourist_username: str
    rating: int
    comment: str
    visit_date: date
    comment_date: datetime
    images: list[str] = []


class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    comment: Optional[str] = None
    images: Optional[list[str]] = None
