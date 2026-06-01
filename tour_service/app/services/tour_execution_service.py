import math
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from app.config import settings
from app.database import get_db
from app.models.tour_execution import (
    CheckProximityRequest,
    ExecutionStatus,
    ProximityCheckResponse,
    StartTourExecutionRequest,
    TourExecutionResponse,
    VisitedKeypoint,
)
from app.services import purchase_service
from app.services.tourist_location_service import set_tourist_location
from app.models.tourist_location import TouristLocationUpdate


def _parse_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid ID format")


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _doc_to_response(doc: dict) -> TourExecutionResponse:
    visited = [
        VisitedKeypoint(keypoint_id=v["keypoint_id"], visited_at=v["visited_at"])
        for v in doc.get("visited_keypoints", [])
    ]
    return TourExecutionResponse(
        id=str(doc["_id"]),
        tour_id=doc["tour_id"],
        tourist_id=doc["tourist_id"],
        status=ExecutionStatus(doc["status"]),
        started_at=doc["started_at"],
        completed_at=doc.get("completed_at"),
        abandoned_at=doc.get("abandoned_at"),
        last_activity_at=doc["last_activity_at"],
        start_latitude=doc["start_latitude"],
        start_longitude=doc["start_longitude"],
        visited_keypoints=visited,
        saga_id=doc.get("saga_id"),
    )


async def _validate_tour_for_execution(tour_id: str, tourist_id: str) -> dict:
    db = get_db()
    tour_oid = _parse_id(tour_id)
    tour = await db.tours.find_one({"_id": tour_oid})
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")

    tour_status = tour.get("status")
    if tour_status not in ("published", "archived"):
        raise HTTPException(
            status_code=400,
            detail="Tour must be published or archived to start execution",
        )

    if not tour.get("keypoints"):
        raise HTTPException(status_code=400, detail="Tour has no keypoints")

    purchased = await purchase_service.has_purchased_tour(tourist_id, tour_id)
    if not purchased:
        raise HTTPException(
            status_code=403,
            detail="Tour must be purchased before starting execution",
        )

    active = await db.tour_executions.find_one(
        {"tourist_id": tourist_id, "status": ExecutionStatus.ACTIVE.value}
    )
    if active:
        raise HTTPException(
            status_code=409,
            detail="You already have an active tour execution",
        )

    return tour


async def create_execution(
    tour_id: str,
    tourist_id: str,
    data: StartTourExecutionRequest,
    saga_id: Optional[str] = None,
) -> TourExecutionResponse:
    await _validate_tour_for_execution(tour_id, tourist_id)
    await set_tourist_location(
        tourist_id,
        TouristLocationUpdate(latitude=data.latitude, longitude=data.longitude),
    )

    now = datetime.now(timezone.utc)
    doc = {
        "tour_id": tour_id,
        "tourist_id": tourist_id,
        "status": ExecutionStatus.ACTIVE.value,
        "started_at": now,
        "completed_at": None,
        "abandoned_at": None,
        "last_activity_at": now,
        "start_latitude": data.latitude,
        "start_longitude": data.longitude,
        "visited_keypoints": [],
        "saga_id": saga_id,
    }
    db = get_db()
    result = await db.tour_executions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)


async def get_active_execution_for_tourist(tourist_id: str) -> Optional[TourExecutionResponse]:
    db = get_db()
    doc = await db.tour_executions.find_one(
        {"tourist_id": tourist_id, "status": ExecutionStatus.ACTIVE.value}
    )
    if not doc:
        return None
    return _doc_to_response(doc)


async def get_active_execution_for_tour(
    tour_id: str, tourist_id: str
) -> Optional[TourExecutionResponse]:
    db = get_db()
    doc = await db.tour_executions.find_one(
        {
            "tour_id": tour_id,
            "tourist_id": tourist_id,
            "status": ExecutionStatus.ACTIVE.value,
        }
    )
    if not doc:
        return None
    return _doc_to_response(doc)


async def _get_execution_or_404(tour_id: str, execution_id: str, tourist_id: str) -> dict:
    db = get_db()
    doc = await db.tour_executions.find_one(
        {
            "_id": _parse_id(execution_id),
            "tour_id": tour_id,
            "tourist_id": tourist_id,
        }
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Tour execution not found")
    return doc


async def _touch_activity(execution_oid: ObjectId) -> datetime:
    now = datetime.now(timezone.utc)
    db = get_db()
    await db.tour_executions.update_one(
        {"_id": execution_oid},
        {"$set": {"last_activity_at": now}},
    )
    return now


async def complete_execution(
    tour_id: str, execution_id: str, tourist_id: str
) -> TourExecutionResponse:
    doc = await _get_execution_or_404(tour_id, execution_id, tourist_id)
    if doc["status"] != ExecutionStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Execution is not active")

    now = datetime.now(timezone.utc)
    db = get_db()
    await db.tour_executions.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": ExecutionStatus.COMPLETED.value,
                "completed_at": now,
                "last_activity_at": now,
            }
        },
    )
    doc["status"] = ExecutionStatus.COMPLETED.value
    doc["completed_at"] = now
    doc["last_activity_at"] = now
    return _doc_to_response(doc)


async def revert_execution_to_active(execution_id: str, tourist_id: str) -> None:
    db = get_db()
    now = datetime.now(timezone.utc)
    await db.tour_executions.update_one(
        {
            "_id": _parse_id(execution_id),
            "tourist_id": tourist_id,
        },
        {
            "$set": {
                "status": ExecutionStatus.ACTIVE.value,
                "completed_at": None,
                "last_activity_at": now,
            }
        },
    )


async def abandon_execution(
    tour_id: str, execution_id: str, tourist_id: str
) -> TourExecutionResponse:
    doc = await _get_execution_or_404(tour_id, execution_id, tourist_id)
    if doc["status"] != ExecutionStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Execution is not active")

    now = datetime.now(timezone.utc)
    db = get_db()
    await db.tour_executions.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": ExecutionStatus.ABANDONED.value,
                "abandoned_at": now,
                "last_activity_at": now,
            }
        },
    )
    doc["status"] = ExecutionStatus.ABANDONED.value
    doc["abandoned_at"] = now
    doc["last_activity_at"] = now
    return _doc_to_response(doc)


async def abandon_execution_by_id(execution_id: str, tourist_id: str) -> None:
    db = get_db()
    now = datetime.now(timezone.utc)
    await db.tour_executions.update_one(
        {
            "_id": _parse_id(execution_id),
            "tourist_id": tourist_id,
            "status": ExecutionStatus.ACTIVE.value,
        },
        {
            "$set": {
                "status": ExecutionStatus.ABANDONED.value,
                "abandoned_at": now,
                "last_activity_at": now,
            }
        },
    )


async def check_proximity(
    tour_id: str,
    execution_id: str,
    tourist_id: str,
    data: CheckProximityRequest,
) -> ProximityCheckResponse:
    doc = await _get_execution_or_404(tour_id, execution_id, tourist_id)
    if doc["status"] != ExecutionStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Execution is not active")

    db = get_db()
    tour = await db.tours.find_one({"_id": _parse_id(tour_id)})
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")

    radius_km = settings.KEYPOINT_PROXIMITY_RADIUS_KM
    visited_ids = {v["keypoint_id"] for v in doc.get("visited_keypoints", [])}
    near_keypoint_id: Optional[str] = None
    newly_visited = False

    for kp in tour.get("keypoints", []):
        kp_id = str(kp.get("id", ""))
        if kp_id in visited_ids:
            continue
        dist = _haversine_km(
            data.latitude,
            data.longitude,
            float(kp["latitude"]),
            float(kp["longitude"]),
        )
        if dist <= radius_km:
            near_keypoint_id = kp_id
            now = datetime.now(timezone.utc)
            await db.tour_executions.update_one(
                {"_id": doc["_id"]},
                {
                    "$push": {
                        "visited_keypoints": {
                            "keypoint_id": kp_id,
                            "visited_at": now,
                        }
                    },
                    "$set": {"last_activity_at": now},
                },
            )
            doc.setdefault("visited_keypoints", []).append(
                {"keypoint_id": kp_id, "visited_at": now}
            )
            doc["last_activity_at"] = now
            newly_visited = True
            break

    if not newly_visited:
        now = await _touch_activity(doc["_id"])
        doc["last_activity_at"] = now

    return ProximityCheckResponse(
        execution=_doc_to_response(doc),
        near_keypoint_id=near_keypoint_id,
        newly_visited=newly_visited,
    )
