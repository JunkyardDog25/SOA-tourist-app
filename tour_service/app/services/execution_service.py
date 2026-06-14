from datetime import datetime, timezone
from math import atan2, cos, radians, sin, sqrt

from fastapi import HTTPException

from app.database import get_db
from app.models.tour_execution import (
    KeypointVisitResponse,
    TourExecutionProgress,
    ManualVisitResponse,
)
from app.services import purchase_service, tour_service

VISIT_RADIUS_METERS = 80.0
EARTH_RADIUS_M = 6371000.0


def _haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1_r, lon1_r = radians(lat1), radians(lon1)
    lat2_r, lon2_r = radians(lat2), radians(lon2)
    d_lat = lat2_r - lat1_r
    d_lon = lon2_r - lon1_r
    a = sin(d_lat / 2) ** 2 + cos(lat1_r) * cos(lat2_r) * sin(d_lon / 2) ** 2
    return EARTH_RADIUS_M * 2 * atan2(sqrt(a), sqrt(1 - a))


async def _get_allowed_keypoints(tourist_id: str, tour_id: str) -> list[dict]:
    tour = await tour_service.get_tour_by_id(tour_id)
    if tour.get("status") != "published":
        raise HTTPException(status_code=403, detail="Tour is not available for execution")

    purchased = await purchase_service.has_purchased_tour(tourist_id, tour_id)
    if purchased:
        return tour.get("keypoints") or []

    first = tour_service.get_public_tour_response(tour).get("first_keypoint")
    return [first] if first else []


async def _existing_visit_ids(tourist_id: str, tour_id: str) -> set[str]:
    db = get_db()
    cursor = db.keypoint_visits.find(
        {"tourist_id": tourist_id, "tour_id": tour_id},
        {"keypoint_id": 1},
    )
    docs = await cursor.to_list(length=500)
    return {doc["keypoint_id"] for doc in docs}


async def _record_visit(
    tourist_id: str,
    tour_id: str,
    keypoint: dict,
    latitude: float,
    longitude: float,
) -> bool:
    """Returns True if a new visit was recorded."""
    db = get_db()
    now = datetime.now(timezone.utc)
    result = await db.keypoint_visits.update_one(
        {
            "tourist_id": tourist_id,
            "tour_id": tour_id,
            "keypoint_id": keypoint["id"],
        },
        {
            "$setOnInsert": {
                "tourist_id": tourist_id,
                "tour_id": tour_id,
                "keypoint_id": keypoint["id"],
                "keypoint_name": keypoint.get("name", ""),
                "visited_at": now,
                "latitude": latitude,
                "longitude": longitude,
            }
        },
        upsert=True,
    )
    return result.upserted_id is not None


async def get_progress(tourist_id: str, tour_id: str) -> TourExecutionProgress:
    keypoints = await _get_allowed_keypoints(tourist_id, tour_id)
    db = get_db()
    visits = await db.keypoint_visits.find(
        {"tourist_id": tourist_id, "tour_id": tour_id}
    ).sort("visited_at", 1).to_list(length=500)

    visit_responses = [
        KeypointVisitResponse(
            keypoint_id=v["keypoint_id"],
            keypoint_name=v.get("keypoint_name", ""),
            visited_at=v["visited_at"],
            latitude=v.get("latitude", 0.0),
            longitude=v.get("longitude", 0.0),
        )
        for v in visits
    ]

    total = len(keypoints)
    visited_count = len(visit_responses)

    return TourExecutionProgress(
        tour_id=tour_id,
        tourist_id=tourist_id,
        total_keypoints=total,
        visited_count=visited_count,
        completed=total > 0 and visited_count >= total,
        visits=visit_responses,
    )


async def check_position(
    tourist_id: str,
    tour_id: str,
    latitude: float,
    longitude: float,
) -> TourExecutionProgress:
    keypoints = await _get_allowed_keypoints(tourist_id, tour_id)
    if not keypoints:
        raise HTTPException(status_code=400, detail="Tour has no keypoints to visit")

    already_visited = await _existing_visit_ids(tourist_id, tour_id)
    newly_visited: list[str] = []

    for keypoint in keypoints:
        if keypoint["id"] in already_visited:
            continue
        distance = _haversine_meters(
            latitude, longitude, keypoint["latitude"], keypoint["longitude"]
        )
        if distance <= VISIT_RADIUS_METERS:
            recorded = await _record_visit(
                tourist_id, tour_id, keypoint, latitude, longitude
            )
            if recorded:
                newly_visited.append(keypoint["id"])
                already_visited.add(keypoint["id"])

    progress = await get_progress(tourist_id, tour_id)
    progress.newly_visited = newly_visited
    return progress


async def mark_keypoint_visited(
    tourist_id: str,
    tour_id: str,
    keypoint_id: str,
    latitude: float | None = None,
    longitude: float | None = None,
) -> ManualVisitResponse:
    keypoints = await _get_allowed_keypoints(tourist_id, tour_id)
    keypoint = next((kp for kp in keypoints if kp["id"] == keypoint_id), None)
    if not keypoint:
        raise HTTPException(status_code=404, detail="Keypoint not found on this tour")

    lat = latitude if latitude is not None else keypoint["latitude"]
    lng = longitude if longitude is not None else keypoint["longitude"]

    already = keypoint_id in await _existing_visit_ids(tourist_id, tour_id)
    await _record_visit(tourist_id, tour_id, keypoint, lat, lng)

    db = get_db()
    doc = await db.keypoint_visits.find_one(
        {"tourist_id": tourist_id, "tour_id": tour_id, "keypoint_id": keypoint_id}
    )

    return ManualVisitResponse(
        keypoint_id=keypoint_id,
        keypoint_name=keypoint.get("name", ""),
        visited_at=doc["visited_at"],
        already_visited=already,
    )
