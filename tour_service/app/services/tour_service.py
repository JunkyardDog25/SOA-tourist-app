from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import HTTPException, status
from app.database import get_db
from app.models.tour import TourCreate, TourUpdate, KeypointCreate, KeypointUpdate


def _tour_to_response(tour: dict) -> dict:
    """Konvertuje MongoDB dokument u response format."""
    tour["id"] = str(tour.pop("_id"))
    for kp in tour.get("keypoints", []):
        if not kp.get("id"):
            kp["id"] = str(uuid4())
    return tour


def _parse_tour_id(tour_id: str) -> ObjectId:
    """Validira i konvertuje tour_id string u MongoDB ObjectId."""
    try:
        return ObjectId(tour_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid tour ID format")


# ─── Tour CRUD ───────────────────────────────────────────────────

async def create_tour(data: TourCreate, author_id: str) -> dict:
    db = get_db()
    now = datetime.now(timezone.utc)

    tour_doc = {
        "author_id": author_id,
        "title": data.title,
        "description": data.description,
        "difficulty": data.difficulty.value,
        "tags": data.tags,
        "status": "draft",       # Uvek draft pri kreiranju
        "price": 0.0,            # Uvek 0 pri kreiranju
        "keypoints": [],
        "created_at": now,
        "updated_at": now,
    }

    result = await db.tours.insert_one(tour_doc)
    tour_doc["_id"] = result.inserted_id
    return _tour_to_response(tour_doc)


async def get_tours_by_author(author_id: str) -> list[dict]:
    db = get_db()
    cursor = db.tours.find({"author_id": author_id})
    tours = await cursor.to_list(length=100)
    return [_tour_to_response(t) for t in tours]


async def get_tour_by_id(tour_id: str) -> dict:
    db = get_db()
    tour_obj_id = _parse_tour_id(tour_id)
    tour = await db.tours.find_one({"_id": tour_obj_id})

    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")

    return _tour_to_response(tour)


async def update_tour(tour_id: str, data: TourUpdate, author_id: str) -> dict:
    db = get_db()
    tour_obj_id = _parse_tour_id(tour_id)
    tour = await db.tours.find_one({"_id": tour_obj_id})

    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    if tour["author_id"] != author_id:
        raise HTTPException(status_code=403, detail="Not your tour")

    update_data = data.model_dump(exclude_none=True)
    if "difficulty" in update_data:
        update_data["difficulty"] = update_data["difficulty"].value
    if "status" in update_data:
        update_data["status"] = update_data["status"].value

    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.tours.update_one(
        {"_id": tour_obj_id},
        {"$set": update_data},
    )
    return await get_tour_by_id(tour_id)


async def delete_tour(tour_id: str, author_id: str):
    db = get_db()
    tour_obj_id = _parse_tour_id(tour_id)
    tour = await db.tours.find_one({"_id": tour_obj_id})

    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    if tour["author_id"] != author_id:
        raise HTTPException(status_code=403, detail="Not your tour")

    await db.tours.delete_one({"_id": tour_obj_id})
    # Obrisi i sve recenzije za tu turu
    await db.reviews.delete_many({"tour_id": tour_id})


async def get_all_published_tours() -> list[dict]:
    """Vraca sve objavljene ture (za turiste)."""
    db = get_db()
    cursor = db.tours.find({"status": "published"})
    tours = await cursor.to_list(length=200)
    return [_tour_to_response(t) for t in tours]


# ─── Keypoint operacije (ugnjezdene u Tour) ─────────────────────

async def add_keypoint(tour_id: str, data: KeypointCreate, author_id: str) -> dict:
    db = get_db()
    tour_obj_id = _parse_tour_id(tour_id)
    tour = await db.tours.find_one({"_id": tour_obj_id})

    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    if tour["author_id"] != author_id:
        raise HTTPException(status_code=403, detail="Not your tour")

    keypoint = {
        "id": str(uuid4()),
        "name": data.name,
        "description": data.description,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "image_url": data.image_url,
    }

    await db.tours.update_one(
        {"_id": tour_obj_id},
        {
            "$push": {"keypoints": keypoint},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    return keypoint


async def update_keypoint(
    tour_id: str, keypoint_id: str, data: KeypointUpdate, author_id: str
) -> dict:
    db = get_db()
    tour_obj_id = _parse_tour_id(tour_id)
    tour = await db.tours.find_one({"_id": tour_obj_id})

    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    if tour["author_id"] != author_id:
        raise HTTPException(status_code=403, detail="Not your tour")

    update_fields = {}
    for field, value in data.model_dump(exclude_none=True).items():
        update_fields[f"keypoints.$.{field}"] = value

    result = await db.tours.update_one(
        {"_id": tour_obj_id, "keypoints.id": keypoint_id},
        {
            "$set": {
                **update_fields,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Keypoint not found")

    tour = await get_tour_by_id(tour_id)
    for kp in tour.get("keypoints", []):
        if kp["id"] == keypoint_id:
            return kp
    raise HTTPException(status_code=404, detail="Keypoint not found")


async def delete_keypoint(tour_id: str, keypoint_id: str, author_id: str):
    db = get_db()
    tour_obj_id = _parse_tour_id(tour_id)
    tour = await db.tours.find_one({"_id": tour_obj_id})

    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    if tour["author_id"] != author_id:
        raise HTTPException(status_code=403, detail="Not your tour")

    result = await db.tours.update_one(
        {"_id": tour_obj_id},
        {
            "$pull": {"keypoints": {"id": keypoint_id}},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Keypoint not found")
