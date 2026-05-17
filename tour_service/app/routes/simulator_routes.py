from fastapi import APIRouter, Depends

from app.auth import TokenData, require_role
from app.models.tourist_location import TouristLocationResponse, TouristLocationUpdate
from app.services import tourist_location_service

router = APIRouter(prefix="/simulator", tags=["Simulator"])


@router.get("/location", response_model=TouristLocationResponse)
async def get_my_location(
    current_user: TokenData = Depends(require_role("ROLE_TOURIST")),
):
    """Trenutna lokacija ulogovanog turiste (ako je ranije postavljena na simulatoru)."""
    return await tourist_location_service.get_tourist_location(current_user.user_id)


@router.put("/location", response_model=TouristLocationResponse)
async def set_my_location(
    data: TouristLocationUpdate,
    current_user: TokenData = Depends(require_role("ROLE_TOURIST")),
):
    """Beleži lokaciju turiste (klik na mapu u simulatoru)."""
    return await tourist_location_service.set_tourist_location(
        current_user.user_id, data
    )
