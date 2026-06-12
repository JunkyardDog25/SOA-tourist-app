import logging

import httpx
from app.config import settings


logger = logging.getLogger(__name__)


async def has_purchased_tour(tourist_id: str, tour_id: str) -> bool:
    """
    Check via purchase_service internal endpoint if tourist has a token for the tour.
    Returns False on any error (fail-open for availability).
    """
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"{settings.PURCHASE_SERVICE_URL}/api/purchases/internal/tokens/check",
                params={"touristId": tourist_id, "tourId": tour_id},
            )
            if resp.status_code == 200:
                return resp.json().get("purchased", False)
    except Exception as exc:
        logger.warning(
            "Purchase check failed for tourist_id=%s tour_id=%s: %s",
            tourist_id,
            tour_id,
            exc,
        )
    return False
