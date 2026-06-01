from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone
from math import atan2, cos, radians, sin, sqrt
from uuid import uuid4
from fastapi import HTTPException
from app.database import get_db
from app.models.tour import (
    TourCreate,
    TourUpdate,
    TourDurationsUpdate,
    KeypointCreate,
    KeypointUpdate,
)


EARTH_RADIUS_KM = 6371.0


def _normalize_keypoints(keypoints: list[dict] | None) -> list[dict]:
    normalized = []
    for keypoint in keypoints or []:
        item = dict(keypoint)
        if not item.get("id"):
            item["id"] = str(uuid4())
        item.setdefault("image_url", "")
        normalized.append(item)
    return normalized


def _normalize_durations(durations: list[dict] | None) -> list[dict]:
    normalized = []
    for duration in durations or []:
        if not duration:
            continue
        normalized.append(
            {
                "transport_type": duration.get("transport_type"),
                "minutes": duration.get("minutes"),
            }
        )
    return normalized


def _tour_to_response(tour: dict) -> dict:
    """Konvertuje MongoDB dokument u response format."""
    response = dict(tour)
    if "_id" in response:
        response["id"] = str(response.pop("_id"))
    else:
        response["id"] = str(response["id"])
    response["tags"] = response.get("tags", [])
    response["price"] = response.get("price", 0.0)
    response["distance_km"] = response.get("distance_km", 0.0)
    response["durations"] = _normalize_durations(response.get("durations"))
    response["keypoints"] = _normalize_keypoints(response.get("keypoints"))
    response["published_at"] = response.get("published_at")
    response["archived_at"] = response.get("archived_at")
    return response


def _tour_to_public_response(tour: dict) -> dict:
    response = _tour_to_response(tour)
    keypoints = response.get("keypoints", [])
    return {
        "id": response["id"],
        "author_id": response["author_id"],
        "title": response["title"],
        "description": response["description"],
        "difficulty": response["difficulty"],
        "tags": response["tags"],
        "status": response["status"],
        "price": response["price"],
        "distance_km": response["distance_km"],
        "durations": response["durations"],
        "first_keypoint": keypoints[0] if keypoints else None,
        "published_at": response["published_at"],
    }


def _calculate_distance_km(keypoints: list[dict]) -> float:
    if len(keypoints) < 2:
        return 0.0

    total_distance = 0.0
    for current, next_keypoint in zip(keypoints, keypoints[1:]):
        lat1 = radians(current["latitude"])
        lon1 = radians(current["longitude"])
        lat2 = radians(next_keypoint["latitude"])
        lon2 = radians(next_keypoint["longitude"])

        lat_delta = lat2 - lat1
        lon_delta = lon2 - lon1
        haversine = (
            sin(lat_delta / 2) ** 2
            + cos(lat1) * cos(lat2) * sin(lon_delta / 2) ** 2
        )
        haversine = min(1.0, haversine)
        central_angle = 2 * atan2(sqrt(haversine), sqrt(1 - haversine))
        total_distance += EARTH_RADIUS_KM * central_angle

    return round(total_distance, 2)


def _duration_documents(data: TourDurationsUpdate) -> list[dict]:
    durations = []
    seen_transport_types = set()

    for duration in data.durations:
        transport_type = duration.transport_type.value
        if transport_type in seen_transport_types:
            raise HTTPException(
                status_code=400,
                detail=f"Duplicate duration for transport type: {transport_type}",
            )
        seen_transport_types.add(transport_type)
        durations.append(
            {
                "transport_type": transport_type,
                "minutes": duration.minutes,
            }
        )

    return durations


def _validate_publishable(tour: dict):
    missing = []

    if not str(tour.get("title", "")).strip():
        missing.append("title")
    if not str(tour.get("description", "")).strip():
        missing.append("description")
    if not tour.get("difficulty"):
        missing.append("difficulty")
    if len(tour.get("keypoints", [])) < 2:
        missing.append("at least two keypoints")

    if missing:
        raise HTTPException(
            status_code=400,
            detail="Tour cannot be published. Missing: " + ", ".join(missing),
        )


def _validate_price_for_sale(tour: dict):
    price = float(tour.get("price", 0.0))
    if price <= 0:
        raise HTTPException(
            status_code=400,
            detail="Set tour price greater than 0 before publishing (PUT /api/tours/{id} with {\"price\": ...})",
        )


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
        "distance_km": 0.0,
        "durations": [],
        "keypoints": [],
        "published_at": None,
        "archived_at": None,
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
    if "status" in update_data:
        raise HTTPException(
            status_code=400,
            detail="Use publish, archive or reactivate endpoints to change tour status",
        )
    if "difficulty" in update_data:
        update_data["difficulty"] = update_data["difficulty"].value

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
    return [_tour_to_public_response(t) for t in tours]


def get_public_tour_response(tour: dict) -> dict:
    return _tour_to_public_response(tour)


async def update_tour_durations(
    tour_id: str, data: TourDurationsUpdate, author_id: str
) -> dict:
    db = get_db()
    tour_obj_id = _parse_tour_id(tour_id)
    tour = await db.tours.find_one({"_id": tour_obj_id})

    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    if tour["author_id"] != author_id:
        raise HTTPException(status_code=403, detail="Not your tour")

    await db.tours.update_one(
        {"_id": tour_obj_id},
        {
            "$set": {
                "durations": _duration_documents(data),
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    return await get_tour_by_id(tour_id)


async def _set_tour_published(tour_obj_id: ObjectId) -> None:
    now = datetime.now(timezone.utc)
    db = get_db()
    await db.tours.update_one(
        {"_id": tour_obj_id},
        {
            "$set": {
                "status": "published",
                "published_at": now,
                "updated_at": now,
            }
        },
    )


async def publish_tour(tour_id: str, author_id: str) -> dict:
    db = get_db()
    tour_obj_id = _parse_tour_id(tour_id)
    tour = await db.tours.find_one({"_id": tour_obj_id})

    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    if tour["author_id"] != author_id:
        raise HTTPException(status_code=403, detail="Not your tour")

    status = tour.get("status")
    if status == "published":
        return await get_tour_by_id(tour_id)
    if status == "archived":
        _validate_publishable(tour)
        _validate_price_for_sale(tour)
        await _set_tour_published(tour_obj_id)
        return await get_tour_by_id(tour_id)
    if status != "draft":
        raise HTTPException(status_code=400, detail="Only draft tours can be published")

    _validate_publishable(tour)
    _validate_price_for_sale(tour)
    await _set_tour_published(tour_obj_id)
    return await get_tour_by_id(tour_id)


async def archive_tour(tour_id: str, author_id: str) -> dict:
    db = get_db()
    tour_obj_id = _parse_tour_id(tour_id)
    tour = await db.tours.find_one({"_id": tour_obj_id})

    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    if tour["author_id"] != author_id:
        raise HTTPException(status_code=403, detail="Not your tour")
    if tour.get("status") != "published":
        raise HTTPException(status_code=400, detail="Only published tours can be archived")

    now = datetime.now(timezone.utc)
    await db.tours.update_one(
        {"_id": tour_obj_id},
        {
            "$set": {
                "status": "archived",
                "archived_at": now,
                "updated_at": now,
            }
        },
    )
    return await get_tour_by_id(tour_id)


async def reactivate_tour(tour_id: str, author_id: str) -> dict:
    db = get_db()
    tour_obj_id = _parse_tour_id(tour_id)
    tour = await db.tours.find_one({"_id": tour_obj_id})

    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    if tour["author_id"] != author_id:
        raise HTTPException(status_code=403, detail="Not your tour")
    if tour.get("status") != "archived":
        raise HTTPException(status_code=400, detail="Only archived tours can be reactivated")

    _validate_publishable(tour)
    _validate_price_for_sale(tour)
    await _set_tour_published(tour_obj_id)
    return await get_tour_by_id(tour_id)


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
    keypoints = _normalize_keypoints(tour.get("keypoints")) + [keypoint]

    await db.tours.update_one(
        {"_id": tour_obj_id},
        {
            "$set": {
                "keypoints": keypoints,
                "distance_km": _calculate_distance_km(keypoints),
                "updated_at": datetime.now(timezone.utc),
            },
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

    keypoints = _normalize_keypoints(tour.get("keypoints"))
    update_data = data.model_dump(exclude_none=True)
    updated_keypoint = None
    for keypoint in keypoints:
        if keypoint["id"] == keypoint_id:
            keypoint.update(update_data)
            updated_keypoint = keypoint
            break

    if not updated_keypoint:
        raise HTTPException(status_code=404, detail="Keypoint not found")

    await db.tours.update_one(
        {"_id": tour_obj_id},
        {
            "$set": {
                "keypoints": keypoints,
                "distance_km": _calculate_distance_km(keypoints),
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return updated_keypoint


async def delete_keypoint(tour_id: str, keypoint_id: str, author_id: str):
    db = get_db()
    tour_obj_id = _parse_tour_id(tour_id)
    tour = await db.tours.find_one({"_id": tour_obj_id})

    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    if tour["author_id"] != author_id:
        raise HTTPException(status_code=403, detail="Not your tour")

    keypoints = _normalize_keypoints(tour.get("keypoints"))
    remaining_keypoints = [kp for kp in keypoints if kp["id"] != keypoint_id]
    if len(remaining_keypoints) == len(keypoints):
        raise HTTPException(status_code=404, detail="Keypoint not found")

    await db.tours.update_one(
        {"_id": tour_obj_id},
        {
            "$set": {
                "keypoints": remaining_keypoints,
                "distance_km": _calculate_distance_km(remaining_keypoints),
                "updated_at": datetime.now(timezone.utc),
            },
        },
    )
