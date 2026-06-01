import grpc

from app.config import settings
from app.grpc.generated import purchase_pb2, purchase_pb2_grpc

_channel: grpc.aio.Channel | None = None
_stub: purchase_pb2_grpc.PurchaseQueryServiceStub | None = None


def _get_stub() -> purchase_pb2_grpc.PurchaseQueryServiceStub:
    global _channel, _stub
    if _stub is None:
        target = f"{settings.PURCHASE_SERVICE_GRPC_HOST}:{settings.PURCHASE_SERVICE_GRPC_PORT}"
        _channel = grpc.aio.insecure_channel(target)
        _stub = purchase_pb2_grpc.PurchaseQueryServiceStub(_channel)
    return _stub


async def has_purchased_tour(tourist_id: str, tour_id: str) -> bool:
    try:
        stub = _get_stub()
        response = await stub.HasPurchasedTour(
            purchase_pb2.HasPurchasedTourRequest(
                tourist_id=tourist_id,
                tour_id=tour_id,
            ),
            timeout=3.0,
        )
        return response.purchased
    except Exception:
        return False


async def has_purchased_tours_batch(tourist_id: str, tour_ids: list[str]) -> dict[str, bool]:
    if not tour_ids:
        return {}
    try:
        stub = _get_stub()
        response = await stub.HasPurchasedToursBatch(
            purchase_pb2.HasPurchasedToursBatchRequest(
                tourist_id=tourist_id,
                tour_ids=tour_ids,
            ),
            timeout=5.0,
        )
        return dict(response.purchased_by_tour_id)
    except Exception:
        return {tid: False for tid in tour_ids}
