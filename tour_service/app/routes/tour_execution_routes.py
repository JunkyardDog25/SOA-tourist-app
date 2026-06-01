from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import TokenData, require_role
from app.models.tour_execution import (
    CheckProximityRequest,
    ProximityCheckResponse,
    StartTourExecutionRequest,
    TourExecutionResponse,
)
from app.services import execution_saga_service, tour_execution_service

router = APIRouter(prefix="/tours", tags=["Tour Execution"])
executions_router = APIRouter(prefix="/executions", tags=["Tour Execution"])


@router.post(
    "/{tour_id}/executions",
    response_model=TourExecutionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def start_tour_execution(
    tour_id: str,
    data: StartTourExecutionRequest,
    current_user: TokenData = Depends(require_role("ROLE_TOURIST")),
):
    """Pokretanje ture (SAGA: tour-service + purchase-service)."""
    return await execution_saga_service.start_execution_with_saga(
        tour_id, current_user.user_id, data
    )


@router.get("/{tour_id}/executions/active", response_model=Optional[TourExecutionResponse])
async def get_active_execution_for_tour(
    tour_id: str,
    current_user: TokenData = Depends(require_role("ROLE_TOURIST")),
):
    return await tour_execution_service.get_active_execution_for_tour(
        tour_id, current_user.user_id
    )


@router.post(
    "/{tour_id}/executions/{execution_id}/complete",
    response_model=TourExecutionResponse,
)
async def complete_tour_execution(
    tour_id: str,
    execution_id: str,
    current_user: TokenData = Depends(require_role("ROLE_TOURIST")),
):
    """Završetak ture (SAGA: tour-service + purchase-service)."""
    return await execution_saga_service.complete_execution_with_saga(
        tour_id, execution_id, current_user.user_id
    )


@router.post(
    "/{tour_id}/executions/{execution_id}/abandon",
    response_model=TourExecutionResponse,
)
async def abandon_tour_execution(
    tour_id: str,
    execution_id: str,
    current_user: TokenData = Depends(require_role("ROLE_TOURIST")),
):
    return await tour_execution_service.abandon_execution(
        tour_id, execution_id, current_user.user_id
    )


@router.post(
    "/{tour_id}/executions/{execution_id}/check-proximity",
    response_model=ProximityCheckResponse,
)
async def check_keypoint_proximity(
    tour_id: str,
    execution_id: str,
    data: CheckProximityRequest,
    current_user: TokenData = Depends(require_role("ROLE_TOURIST")),
):
    return await tour_execution_service.check_proximity(
        tour_id, execution_id, current_user.user_id, data
    )


@executions_router.get("/active", response_model=Optional[TourExecutionResponse])
async def get_active_execution(
    current_user: TokenData = Depends(require_role("ROLE_TOURIST")),
):
    return await tour_execution_service.get_active_execution_for_tourist(
        current_user.user_id
    )
