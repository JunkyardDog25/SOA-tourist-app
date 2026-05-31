from typing import Optional
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    """Base model that serialises/deserialises using camelCase JSON keys
    so it is wire-compatible with the Java purchase-service DTOs."""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


# ─── validate-batch ─────────────────────────────────────────────

class ValidationItem(_CamelModel):
    tour_id: str
    price: float


class TourValidationRequest(_CamelModel):
    items: list[ValidationItem]


class ValidationResult(_CamelModel):
    tour_id: str
    valid: bool
    reason: Optional[str] = None


class TourValidationResponse(_CamelModel):
    all_valid: bool
    results: list[ValidationResult]


# ─── record-purchases ────────────────────────────────────────────

class PurchaseItem(_CamelModel):
    tour_id: str
    price: float


class RecordPurchasesRequest(_CamelModel):
    saga_id: str
    tourist_id: str
    items: list[PurchaseItem]


class RecordPurchasesResponse(_CamelModel):
    saga_id: str
    records_created: int
