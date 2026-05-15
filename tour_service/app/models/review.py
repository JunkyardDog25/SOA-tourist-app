from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date


class ReviewCreate(BaseModel):
    tour_id: str
    rating: int = Field(ge=1, le=5, description="Ocena od 1 do 5")
    comment: str = Field(min_length=1, max_length=4000)
    visit_date: date
    images: list[str] = Field(default_factory=list)


class ReviewResponse(BaseModel):
    id: str
    tour_id: str
    tourist_id: str
    tourist_username: str
    rating: int
    comment: str
    visit_date: date
    comment_date: datetime
    images: list[str] = Field(default_factory=list)


class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    comment: Optional[str] = Field(default=None, min_length=1, max_length=4000)
    images: Optional[list[str]] = None
