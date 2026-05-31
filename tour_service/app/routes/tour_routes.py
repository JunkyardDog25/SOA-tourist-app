from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import get_current_user, require_role, TokenData
from app.models.tour import (
    TourCreate, TourUpdate, TourResponse, TourPublicResponse, TourDurationsUpdate,
    KeypointCreate, KeypointUpdate, KeypointResponse,
)
from app.services import tour_service, purchase_service

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


@router.get("/published", response_model=list[TourPublicResponse])
async def get_published_tours(
    current_user: TokenData = Depends(get_current_user),
):
    """Svi korisnici mogu videti osnovne informacije objavljenih tura."""
    return await tour_service.get_all_published_tours()


@router.get("/{tour_id}", response_model=TourResponse | TourPublicResponse)
async def get_tour(
    tour_id: str,
    current_user: TokenData = Depends(get_current_user),
):
    """Dohvati turu. Turista vidi sve ključne tačke samo ako je turu kupio."""
    tour = await tour_service.get_tour_by_id(tour_id)
    is_owner_or_admin = (
        tour["author_id"] == current_user.user_id or "ROLE_ADMIN" in current_user.roles
    )
    if (
        tour["status"] != "published"
        and not is_owner_or_admin
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this tour",
        )
    if is_owner_or_admin:
        return tour

    # Tourist: check if purchased → reveal all keypoints
    if "ROLE_TOURIST" in current_user.roles:
        purchased = await purchase_service.has_purchased_tour(current_user.user_id, tour_id)
        if purchased:
            return tour

    return tour_service.get_public_tour_response(tour)


@router.put("/{tour_id}", response_model=TourResponse)
async def update_tour(
    tour_id: str,
    data: TourUpdate,
    current_user: TokenData = Depends(require_role("ROLE_GUIDE")),
):
    """Autor azurira svoju turu (naziv, opis, status, cenu...)."""
    return await tour_service.update_tour(tour_id, data, current_user.user_id)


@router.put("/{tour_id}/durations", response_model=TourResponse)
async def update_tour_durations(
    tour_id: str,
    data: TourDurationsUpdate,
    current_user: TokenData = Depends(require_role("ROLE_GUIDE")),
):
    """Autor definiše vremena obilaska ture po tipu prevoza."""
    return await tour_service.update_tour_durations(tour_id, data, current_user.user_id)


@router.post("/{tour_id}/publish", response_model=TourResponse)
async def publish_tour(
    tour_id: str,
    current_user: TokenData = Depends(require_role("ROLE_GUIDE")),
):
    """Autor objavljuje draft turu ako su ispunjeni uslovi objave."""
    return await tour_service.publish_tour(tour_id, current_user.user_id)


@router.post("/{tour_id}/archive", response_model=TourResponse)
async def archive_tour(
    tour_id: str,
    current_user: TokenData = Depends(require_role("ROLE_GUIDE")),
):
    """Autor arhivira objavljenu turu."""
    return await tour_service.archive_tour(tour_id, current_user.user_id)


@router.post("/{tour_id}/reactivate", response_model=TourResponse)
async def reactivate_tour(
    tour_id: str,
    current_user: TokenData = Depends(require_role("ROLE_GUIDE")),
):
    """Autor ponovo aktivira arhiviranu turu."""
    return await tour_service.reactivate_tour(tour_id, current_user.user_id)


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


@router.put("/{tour_id}/keypoints/{keypoint_id}", response_model=KeypointResponse)
async def update_keypoint(
    tour_id: str,
    keypoint_id: str,
    data: KeypointUpdate,
    current_user: TokenData = Depends(require_role("ROLE_GUIDE")),
):
    """Autor azurira kljucnu tacku (ukljucujuci novu poziciju sa mape)."""
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