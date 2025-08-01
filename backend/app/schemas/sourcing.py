# File: src/schemas/sourcing.py

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

from ..db.models import (
    ProductType,
    Market,
    SourcingItemStatus,
    ProductCondition,
    DestinationWarehouse,
    TrackingStatus,
    Carrier,
)


class SourcingItemBase(BaseModel):
    uid: Optional[str] = None
    product_name: str
    sku: str
    quantity_needed: int = Field(gt=0, default=1)
    sourced_price: float = 0
    shipping_charges: float = 0
    tax: float = 0                        # ← Newly added field
    product_type: ProductType
    category: str
    sourcer_remarks: Optional[str] = None
    target_cost_per_unit: float = 0
    type_code: Optional[str] = None
    brnd_cod: Optional[str] = None
    model_code: Optional[str] = None
    abbr_code: Optional[str] = None
    color_code: Optional[str] = None
    cnd_code: Optional[str] = None
    regular_price: Optional[float] = None
    price: Optional[float] = None
    sku_efficiency: float = 0

    tested: bool = False
    product_condition: Optional[ProductCondition] = ProductCondition.Excellent

    model_config = {
        "protected_namespaces": ()
    }


class SourcingItemCreate(SourcingItemBase):
    model_config = {
        "protected_namespaces": ()
    }


class SourcingItem(SourcingItemBase):
    id: int
    sourcing_id: int
    tested: bool = False
    product_condition: Optional[ProductCondition] = None

    model_config = {
        "from_attributes": True,
        "protected_namespaces": ()
    }


class SourcingIDBase(BaseModel):
    seller_name: Optional[str] = None
    listing_link: Optional[str] = None
    market: Optional[Market] = None
    origin: Optional[str] = None
    sellers_price: float = 0
    shipping_price: float = 0
    tax: float = 0

    model_config = {
        "protected_namespaces": ()
    }


class SourcingIDCreate(SourcingIDBase):
    items: List[SourcingItemCreate]


class SourcingID(SourcingIDBase):
    id: int
    status: SourcingItemStatus
    sourcer_id: int
    purchaser_id: Optional[int] = None

    created_on: datetime = Field(..., alias="created_at")
    assigned_at: Optional[datetime] = None
    finalized_at: Optional[datetime] = None
    purchaser_action_time: Optional[datetime] = None

    target_total: float = 0
    sourced_price: float = 0
    savings: float = 0
    is_manual_override: bool = False

    market_order_num: Optional[str] = None
    purchase_link: Optional[str] = None
    destination_warehouse: Optional[DestinationWarehouse] = None
    tracking_status: Optional[TrackingStatus] = None
    carrier: Optional[Carrier] = None
    tracking_id: Optional[str] = None
    tracking_link: Optional[str] = None

    items: List[SourcingItem] = Field(default_factory=list)

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "protected_namespaces": ()
    }


class SourcingIDUpdate(BaseModel):
    status: Optional[SourcingItemStatus] = None
    market_order_num: Optional[str] = None
    purchase_link: Optional[str] = None
    destination_warehouse: Optional[DestinationWarehouse] = None
    tracking_status: Optional[TrackingStatus] = None
    carrier: Optional[Carrier] = None
    tracking_id: Optional[str] = None
    tracking_link: Optional[str] = None
    sourced_price: Optional[float] = None
    target_total: Optional[float] = None
    savings: Optional[float] = None
    is_manual_override: Optional[bool] = None

    seller_name: Optional[str] = None
    listing_link: Optional[str] = None
    market: Optional[Market] = None
    origin: Optional[str] = None
    sellers_price: Optional[float] = None
    shipping_price: Optional[float] = None
    tax: Optional[float] = None

    model_config = {
        "protected_namespaces": (),
        "extra": "ignore"
    }

    @field_validator("market", mode="before")
    def convert_market(cls, value):
        if isinstance(value, str):
            try:
                return Market(value)
            except ValueError:
                return None
        return value


class SourcingItemUpdate(BaseModel):
    product_name: Optional[str] = None
    sku: Optional[str] = None
    tested: Optional[bool] = None
    product_condition: Optional[ProductCondition] = None
    sourced_price: Optional[float] = None
    shipping_charges: Optional[float] = None
    tax: Optional[float] = None         # ← Also available for partial updates
    target_cost_per_unit: Optional[float] = None
    type_code: Optional[str] = None
    brnd_cod: Optional[str] = None
    model_code: Optional[str] = None
    abbr_code: Optional[str] = None
    color_code: Optional[str] = None
    cnd_code: Optional[str] = None
    regular_price: Optional[float] = None
    price: Optional[float] = None
    quantity_needed: Optional[int] = None

    model_config = {
        "protected_namespaces": (),
        "extra": "ignore"
    }
