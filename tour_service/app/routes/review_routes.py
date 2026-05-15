from fastapi import APIRouter, Depends
from app.auth import get_current_user, require_role, TokenData
from app.models.review import ReviewCreate, ReviewResponse, ReviewUpdate
from app.services import review_service

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("", response_model=ReviewResponse, status_code=201)
async def create_review(
    data: ReviewCreate,
    current_user: TokenData = Depends(require_role("ROLE_TOURIST")),
):
    """Turista ostavlja recenziju za turu (ocena 1-5, komentar, datum posete, slike)."""
    return await review_service.create_review(
        data, current_user.user_id, current_user.username
    )


@router.get("/tour/{tour_id}", response_model=list[ReviewResponse])
async def get_tour_reviews(
    tour_id: str,
    current_user: TokenData = Depends(get_current_user),
):
    """Dohvati sve recenzije za odredjenu turu."""
    return await review_service.get_reviews_for_tour(tour_id)


@router.get("/tour/{tour_id}/rating")
async def get_tour_rating(
    tour_id: str,
    current_user: TokenData = Depends(get_current_user),
):
    """Prosecna ocena i broj recenzija za turu (MongoDB agregacija)."""
    return await review_service.get_tour_average_rating(tour_id)


@router.put("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: str,
    data: ReviewUpdate,
    current_user: TokenData = Depends(require_role("ROLE_TOURIST")),
):
    """Turista azurira svoju recenziju."""
    return await review_service.update_review(
        review_id, data, current_user.user_id
    )


@router.delete("/{review_id}", status_code=204)
async def delete_review(
    review_id: str,
    current_user: TokenData = Depends(require_role("ROLE_TOURIST")),
):
    """Turista brise svoju recenziju."""
    await review_service.delete_review(review_id, current_user.user_id)
