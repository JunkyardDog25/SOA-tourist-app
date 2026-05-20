from datetime import datetime, timezone

from app.database import get_db
from app.models.tourist_location import TouristLocationUpdate


def _empty_location(tourist_id: str) -> dict:
    return {
        "tourist_id": tourist_id,
        "latitude": None,
        "longitude": None,
        "updated_at": None,
    }


async def get_tourist_location(tourist_id: str) -> dict:
    """Trenutna lokacija turiste (simulator, kasnije TourExecution)."""
    db = get_db()
    doc = await db.tourist_locations.find_one({"tourist_id": tourist_id})
    if not doc:
        return _empty_location(tourist_id)
    return {
        "tourist_id": doc["tourist_id"],
        "latitude": doc["latitude"],
        "longitude": doc["longitude"],
        "updated_at": doc["updated_at"],
    }


async def set_tourist_location(tourist_id: str, data: TouristLocationUpdate) -> dict:
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        "tourist_id": tourist_id,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "updated_at": now,
    }
    await db.tourist_locations.update_one(
        {"tourist_id": tourist_id},
        {"$set": doc},
        upsert=True,
    )
    return doc
