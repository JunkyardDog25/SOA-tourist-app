from fastapi import APIRouter, Depends, status

from app.auth import get_current_user, TokenData
from app.models.saga import (
    RecordPurchasesRequest,
    RecordPurchasesResponse,
    TourValidationRequest,
    TourValidationResponse,
)
from app.services import saga_service

# Same prefix as tour_router so the full paths become /api/tours/...
router = APIRouter(prefix="/tours", tags=["SAGA"])
internal_router = APIRouter(prefix="/tours/internal", tags=["SAGA Internal"])


@router.post(
    "/validate-batch",
    response_model=TourValidationResponse,
    response_model_by_alias=True,
)
async def validate_batch(
    request: TourValidationRequest,
    _: TokenData = Depends(get_current_user),
):
    """Pre-flight: validates that all cart items are purchasable (published, price matches)."""
    return await saga_service.validate_batch(request)


@router.post(
    "/purchases/record",
    response_model=RecordPurchasesResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
)
async def record_purchases(
    request: RecordPurchasesRequest,
    _: TokenData = Depends(get_current_user),
):
    """SAGA Step 1: increment sold_count per tour and persist purchase records tagged with sagaId."""
    return await saga_service.record_purchases(request)


@router.delete(
    "/purchases/record/{saga_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_purchase_records(
    saga_id: str,
    _: TokenData = Depends(get_current_user),
):
    """SAGA Compensation for Step 1: reverse sold_count increments and delete records by sagaId."""
    await saga_service.delete_purchase_records(saga_id)


# ─── Internal (purchase-service → tour-service, no JWT) ─────────

@internal_router.post(
    "/validate-batch",
    response_model=TourValidationResponse,
    response_model_by_alias=True,
)
async def validate_batch_internal(request: TourValidationRequest):
    return await saga_service.validate_batch(request)


@internal_router.post(
    "/purchases/record",
    response_model=RecordPurchasesResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
)
async def record_purchases_internal(request: RecordPurchasesRequest):
    return await saga_service.record_purchases(request)


@internal_router.delete(
    "/purchases/record/{saga_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_purchase_records_internal(saga_id: str):
    await saga_service.delete_purchase_records(saga_id)
