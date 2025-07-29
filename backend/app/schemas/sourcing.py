from datetime import datetime
from typing import List

from pydantic import BaseModel, Field

from ..db.models import (
    ProductType,
    Market,
    SourcingItemStatus,
    ProductCondition,
    DestinationWarehouse,
    TrackingStatus,
    Carrier,
)

# ─────────────────────────────
# Sourcing Item Schemas
# ─────────────────────────────
class SourcingItemBase(BaseModel):
    product_name: str
    sku: str
    quantity_needed: int = Field(gt=0, default=1)
    sourced_price: float = 0
    product_type: ProductType
    category: str
    sourcer_remarks: str | None = None
    # NEW: store target at create time
    target_cost_per_unit: float = 0

class SourcingItemCreate(SourcingItemBase):
    pass

class SourcingItem(SourcingItemBase):
    id: int
    sourcing_id: int
    tested: bool = False
    product_condition: ProductCondition | None = None

    model_config = {
        "from_attributes": True
    }


# ─────────────────────────────
# Sourcing ID (Order) Schemas
# ─────────────────────────────
class SourcingIDBase(BaseModel):
    seller_name: str | None = None
    listing_link: str | None = None
    market: Market
    origin: str
    sellers_price: float = 0
    shipping_price: float = 0
    tax: float = 0

class SourcingIDCreate(SourcingIDBase):
    items: List[SourcingItemCreate]

class SourcingID(SourcingIDBase):
    id: int
    status: SourcingItemStatus
    sourcer_id: int
    purchaser_id: int | None = None

    # API returns created_at -> expose as created_on too
    created_on: datetime = Field(..., alias="created_at")
    assigned_at: datetime | None = None
    finalized_at: datetime | None = None
    purchaser_action_time: datetime | None = None

    # NEW: precomputed totals saved in DB
    target_total: float = 0
    savings: float = 0

    market_order_num: str | None = None
    purchase_link: str | None = None
    destination_warehouse: DestinationWarehouse | None = None
    tracking_status: TrackingStatus | None = None
    carrier: Carrier | None = None
    tracking_id: str | None = None
    tracking_link: str | None = None

    items: List[SourcingItem] = Field(default_factory=list)

    model_config = {
        "from_attributes": True,
        "populate_by_name": True
    }


# ─────────────────────────────
# Purchaser Update Schemas
# ─────────────────────────────
class SourcingIDUpdate(BaseModel):
    status: SourcingItemStatus | None = None
    market_order_num: str | None = None
    purchase_link: str | None = None
    destination_warehouse: DestinationWarehouse | None = None
    tracking_status: TrackingStatus | None = None
    carrier: Carrier | None = None
    tracking_id: str | None = None
    tracking_link: str | None = None

class SourcingItemUpdate(BaseModel):
    tested: bool | None = None
    product_condition: ProductCondition | None = None
