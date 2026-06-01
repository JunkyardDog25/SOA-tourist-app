import httpx

from app.config import settings
from app.grpc import purchase_client


async def has_purchased_tour(tourist_id: str, tour_id: str) -> bool:
    """Provera kupovine preko gRPC (fallback na HTTP)."""
    purchased = await purchase_client.has_purchased_tour(tourist_id, tour_id)
    if purchased:
        return True
    return await _has_purchased_tour_http(tourist_id, tour_id)


async def _has_purchased_tour_http(tourist_id: str, tour_id: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"{settings.PURCHASE_SERVICE_URL}/api/purchases/internal/tokens/check",
                params={"touristId": tourist_id, "tourId": tour_id},
            )
            if resp.status_code == 200:
                return resp.json().get("purchased", False)
    except Exception:
        pass
    return False
