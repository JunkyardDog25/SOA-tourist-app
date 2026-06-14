import logging

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings


logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None


async def connect_to_mongo():
    global client, db
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]

    # Kreiranje indeksa
    await db.tours.create_index("author_id")
    await db.tours.create_index("status")
    await db.tours.create_index("tags")
    await db.reviews.create_index("tour_id")
    await db.reviews.create_index("tourist_id")
    await db.reviews.create_index(
        [("tour_id", 1), ("tourist_id", 1)],
        unique=True,
        name="uniq_tour_review_per_tourist",
    )
    await db.tourist_locations.create_index(
        "tourist_id",
        unique=True,
        name="uniq_tourist_location",
    )
    await db.purchase_records.create_index("saga_id", name="idx_purchase_records_saga_id")
    await db.keypoint_visits.create_index(
        [("tourist_id", 1), ("tour_id", 1), ("keypoint_id", 1)],
        unique=True,
        name="uniq_keypoint_visit",
    )
    await db.keypoint_visits.create_index(
        [("tourist_id", 1), ("tour_id", 1)],
        name="idx_visits_by_tour",
    )

    logger.info("Connected to MongoDB: %s", settings.MONGO_DB)


async def close_mongo_connection():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")


def get_db():
    return db
