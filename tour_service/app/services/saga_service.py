from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException

from app.database import get_db
from app.models.saga import (
    RecordPurchasesRequest,
    RecordPurchasesResponse,
    TourValidationRequest,
    TourValidationResponse,
    ValidationResult,
)

_PRICE_TOLERANCE = 0.01


def _parse_tour_id(tour_id: str) -> ObjectId:
    try:
        return ObjectId(tour_id)
    except (InvalidId, TypeError):
        return None


# ─── validate-batch ─────────────────────────────────────────────

async def validate_batch(request: TourValidationRequest) -> TourValidationResponse:
    db = get_db()
    results: list[ValidationResult] = []

    for item in request.items:
        obj_id = _parse_tour_id(item.tour_id)
        if obj_id is None:
            results.append(ValidationResult(tour_id=item.tour_id, valid=False, reason="Invalid tour ID format"))
            continue

        tour = await db.tours.find_one({"_id": obj_id})

        if tour is None:
            results.append(ValidationResult(tour_id=item.tour_id, valid=False, reason="Tour not found"))
            continue

        if tour.get("status") == "archived":
            results.append(ValidationResult(tour_id=item.tour_id, valid=False, reason="Tour is archived"))
            continue

        if tour.get("status") != "published":
            results.append(ValidationResult(tour_id=item.tour_id, valid=False, reason="Tour is not published"))
            continue

        stored_price: float = tour.get("price", 0.0)
        if abs(stored_price - item.price) > _PRICE_TOLERANCE:
            results.append(ValidationResult(
                tour_id=item.tour_id,
                valid=False,
                reason=f"Price mismatch: expected {stored_price}, got {item.price}",
            ))
            continue

        results.append(ValidationResult(tour_id=item.tour_id, valid=True))

    all_valid = all(r.valid for r in results)
    return TourValidationResponse(all_valid=all_valid, results=results)


# ─── record-purchases ────────────────────────────────────────────

async def record_purchases(request: RecordPurchasesRequest) -> RecordPurchasesResponse:
    db = get_db()
    now = datetime.now(timezone.utc)
    records_created = 0

    for item in request.items:
        obj_id = _parse_tour_id(item.tour_id)
        if obj_id is None:
            raise HTTPException(status_code=400, detail=f"Invalid tour ID: {item.tour_id}")

        await db.tours.update_one(
            {"_id": obj_id},
            {"$inc": {"sold_count": 1}},
        )

        await db.purchase_records.insert_one({
            "saga_id": request.saga_id,
            "tourist_id": request.tourist_id,
            "tour_id": item.tour_id,
            "created_at": now,
        })
        records_created += 1

    return RecordPurchasesResponse(saga_id=request.saga_id, records_created=records_created)


# ─── delete-purchase-records (compensation) ──────────────────────

async def delete_purchase_records(saga_id: str) -> None:
    db = get_db()

    records = await db.purchase_records.find({"saga_id": saga_id}).to_list(length=None)

    for record in records:
        obj_id = _parse_tour_id(record["tour_id"])
        if obj_id is not None:
            await db.tours.update_one(
                {"_id": obj_id},
                {"$inc": {"sold_count": -1}},
            )

    await db.purchase_records.delete_many({"saga_id": saga_id})
