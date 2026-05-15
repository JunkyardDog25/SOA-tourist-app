from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError
from app.database import get_db
from app.models.review import ReviewCreate, ReviewUpdate


def _review_to_response(review: dict) -> dict:
    """Konvertuje MongoDB dokument u response format."""
    review["id"] = str(review.pop("_id"))
    return review


def _parse_object_id(value: str, field_name: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} format")


async def create_review(data: ReviewCreate, tourist_id: str, tourist_username: str) -> dict:
    db = get_db()

    # Proveri da li tura postoji
    tour = await db.tours.find_one({"_id": _parse_object_id(data.tour_id, "tour ID")})

    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")

    if tour["status"] != "published":
        raise HTTPException(status_code=400, detail="Cannot review a non-published tour")

    # Proveri da li je turista vec ostavio recenziju za ovu turu
    existing = await db.reviews.find_one({
        "tour_id": data.tour_id,
        "tourist_id": tourist_id,
    })
    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already reviewed this tour",
        )

    review_doc = {
        "tour_id": data.tour_id,
        "tourist_id": tourist_id,
        "tourist_username": tourist_username,
        "rating": data.rating,
        "comment": data.comment,
        "visit_date": data.visit_date.isoformat(),
        "comment_date": datetime.now(timezone.utc),
        "images": data.images,
    }

    try:
        result = await db.reviews.insert_one(review_doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="You have already reviewed this tour",
        )
    review_doc["_id"] = result.inserted_id
    return _review_to_response(review_doc)


async def get_reviews_for_tour(tour_id: str) -> list[dict]:
    db = get_db()
    cursor = db.reviews.find({"tour_id": tour_id}).sort("comment_date", -1)
    reviews = await cursor.to_list(length=100)
    return [_review_to_response(r) for r in reviews]


async def get_tour_average_rating(tour_id: str) -> dict:
    """Agregatni upit - prosecna ocena i broj recenzija."""
    db = get_db()
    pipeline = [
        {"$match": {"tour_id": tour_id}},
        {
            "$group": {
                "_id": "$tour_id",
                "average_rating": {"$avg": "$rating"},
                "total_reviews": {"$sum": 1},
            }
        },
    ]
    result = await db.reviews.aggregate(pipeline).to_list(length=1)

    if not result:
        return {"tour_id": tour_id, "average_rating": 0, "total_reviews": 0}

    return {
        "tour_id": tour_id,
        "average_rating": round(result[0]["average_rating"], 2),
        "total_reviews": result[0]["total_reviews"],
    }


async def update_review(review_id: str, data: ReviewUpdate, tourist_id: str) -> dict:
    db = get_db()
    review_obj_id = _parse_object_id(review_id, "review ID")
    review = await db.reviews.find_one({"_id": review_obj_id})

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review["tourist_id"] != tourist_id:
        raise HTTPException(status_code=403, detail="Not your review")

    update_data = data.model_dump(exclude_none=True)
    await db.reviews.update_one(
        {"_id": review_obj_id},
        {"$set": update_data},
    )

    updated = await db.reviews.find_one({"_id": review_obj_id})
    return _review_to_response(updated)


async def delete_review(review_id: str, tourist_id: str):
    db = get_db()
    review_obj_id = _parse_object_id(review_id, "review ID")
    review = await db.reviews.find_one({"_id": review_obj_id})

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review["tourist_id"] != tourist_id:
        raise HTTPException(status_code=403, detail="Not your review")

    await db.reviews.delete_one({"_id": review_obj_id})
