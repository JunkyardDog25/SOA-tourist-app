from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import get_current_user, require_role, TokenData
from app.models.tour import (
    TourCreate, TourUpdate, TourResponse,
    KeypointCreate, KeypointUpdate, KeypointResponse,
)
from app.services import tour_service

router = APIRouter(prefix="/tours", tags=["Tours"])


# ─── Tour CRUD ───────────────────────────────────────────────────

@router.post("", response_model=TourResponse, status_code=201)
async def create_tour(
    data: TourCreate,
    current_user: TokenData = Depends(require_role("ROLE_GUIDE")),
):
    """Autor kreira novu turu (status=draft, price=0)."""
    return await tour_service.create_tour(data, current_user.user_id)


@router.get("/my", response_model=list[TourResponse])
async def get_my_tours(
    current_user: TokenData = Depends(require_role("ROLE_GUIDE")),
):
    """Autor vidi sve svoje ture."""
    return await tour_service.get_tours_by_author(current_user.user_id)


@router.get("/published", response_model=list[TourResponse])
async def get_published_tours(
    current_user: TokenData = Depends(get_current_user),
):
    """Svi korisnici mogu videti objavljene ture."""
    return await tour_service.get_all_published_tours()


@router.get("/{tour_id}", response_model=TourResponse)
async def get_tour(
    tour_id: str,
    current_user: TokenData = Depends(get_current_user),
):
    """Dohvati jednu turu po ID-u. Draft ture vidi samo autor ili admin."""
    tour = await tour_service.get_tour_by_id(tour_id)
    if (
        tour["status"] != "published"
        and tour["author_id"] != current_user.user_id
        and "ROLE_ADMIN" not in current_user.roles
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this tour",
        )
    return tour


@router.put("/{tour_id}", response_model=TourResponse)
async def update_tour(
    tour_id: str,
    data: TourUpdate,
    current_user: TokenData = Depends(require_role("ROLE_GUIDE")),
):
    """Autor azurira svoju turu (naziv, opis, status, cenu...)."""
    return await tour_service.update_tour(tour_id, data, current_user.user_id)


@router.delete("/{tour_id}", status_code=204)
async def delete_tour(
    tour_id: str,
    current_user: TokenData = Depends(require_role("ROLE_GUIDE")),
):
    """Autor brise svoju turu."""
    await tour_service.delete_tour(tour_id, current_user.user_id)


# ─── Keypoint endpointi ──────────────────────────────────────────

@router.post("/{tour_id}/keypoints", response_model=KeypointResponse, status_code=201)
async def add_keypoint(
    tour_id: str,
    data: KeypointCreate,
    current_user: TokenData = Depends(require_role("ROLE_GUIDE")),
):
    """Autor dodaje kljucnu tacku na turu (lat, lng, naziv, opis, slika)."""
    return await tour_service.add_keypoint(tour_id, data, current_user.user_id)


@router.put("/{tour_id}/keypoints/{keypoint_id}", response_model=TourResponse)
async def update_keypoint(
    tour_id: str,
    keypoint_id: str,
    data: KeypointUpdate,
    current_user: TokenData = Depends(require_role("ROLE_GUIDE")),
):
    """Autor azurira kljucnu tacku."""
    return await tour_service.update_keypoint(
        tour_id, keypoint_id, data, current_user.user_id
    )


@router.delete("/{tour_id}/keypoints/{keypoint_id}", status_code=204)
async def delete_keypoint(
    tour_id: str,
    keypoint_id: str,
    current_user: TokenData = Depends(require_role("ROLE_GUIDE")),
):
    """Autor brise kljucnu tacku."""
    await tour_service.delete_keypoint(tour_id, keypoint_id, current_user.user_id)