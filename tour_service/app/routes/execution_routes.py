from fastapi import APIRouter, Depends

from app.auth import TokenData, require_role
from app.models.tour_execution import PositionCheck, TourExecutionProgress, ManualVisitResponse
from app.services import execution_service

router = APIRouter(prefix="/execution", tags=["TourExecution"])


@router.get("/{tour_id}/progress", response_model=TourExecutionProgress)
async def get_execution_progress(
    tour_id: str,
    current_user: TokenData = Depends(require_role("ROLE_TOURIST")),
):
    """Evidencija obilaska — koje tačke je turista već obišao na datoj turi."""
    return await execution_service.get_progress(current_user.user_id, tour_id)


@router.post("/{tour_id}/check-position", response_model=TourExecutionProgress)
async def check_position_on_tour(
    tour_id: str,
    data: PositionCheck,
    current_user: TokenData = Depends(require_role("ROLE_TOURIST")),
):
    """
    Proverava lokaciju turiste u odnosu na tačke ture.
    Ako je unutar 80m od tačke, automatski je beleži kao obišenu.
    """
    return await execution_service.check_position(
        current_user.user_id,
        tour_id,
        data.latitude,
        data.longitude,
    )


@router.post(
    "/{tour_id}/keypoints/{keypoint_id}/visit",
    response_model=ManualVisitResponse,
)
async def mark_keypoint_visited(
    tour_id: str,
    keypoint_id: str,
    current_user: TokenData = Depends(require_role("ROLE_TOURIST")),
):
    """Ručno označavanje tačke kao obišene (za demonstraciju / simulator)."""
    return await execution_service.mark_keypoint_visited(
        current_user.user_id,
        tour_id,
        keypoint_id,
    )
