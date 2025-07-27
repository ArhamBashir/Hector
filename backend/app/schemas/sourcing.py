from pydantic import BaseModel, Field
from typing import List
from datetime import datetime
from ..db.models import ProductType, Market, SourcingItemStatus, ProductCondition, DestinationWarehouse, TrackingStatus, Carrier

# --- Sourcing Item Schemas ---

class SourcingItemBase(BaseModel):
    product_name: str
    sku: str
    quantity_needed: int = Field(gt=0)
    sourced_price: float
    product_type: ProductType
    category: str
    sourcer_remarks: str | None = None

class SourcingItemCreate(SourcingItemBase):
    pass

class SourcingItem(SourcingItemBase):
    id: int
    sourcing_id: int
    tested: bool
    product_condition: ProductCondition | None = None
    
    class Config:
        from_attributes = True

# --- Sourcing ID Schemas ---

class SourcingIDBase(BaseModel):
    seller_name: str | None = None
    listing_link: str | None = None
    market: Market
    origin: str
    sellers_price: float
    shipping_price: float
    tax: float

class SourcingIDCreate(SourcingIDBase):
    items: List[SourcingItemCreate]

class SourcingID(SourcingIDBase):
    id: int
    status: SourcingItemStatus
    sourcer_id: int
    purchaser_id: int | None = None
    created_at: datetime
    assigned_at: datetime | None = None
    items: List[SourcingItem] = []
    market_order_num: str | None = None
    purchase_link: str | None = None
    destination_warehouse: DestinationWarehouse | None = None
    tracking_status: TrackingStatus | None = None
    carrier: Carrier | None = None
    tracking_id: str | None = None
    tracking_link: str | None = None
    purchaser_action_time: datetime | None = None


    class Config:
        from_attributes = True

# --- Purchaser Update Schemas ---

# NEW: For updating the whole order
class SourcingIDUpdate(BaseModel):
    status: SourcingItemStatus | None = None
    market_order_num: str | None = None
    purchase_link: str | None = None
    destination_warehouse: DestinationWarehouse | None = None
    tracking_status: TrackingStatus | None = None
    carrier: Carrier | None = None
    tracking_id: str | None = None
    tracking_link: str | None = None

# UPDATED: For updating item-specific details
class SourcingItemUpdate(BaseModel):
    tested: bool | None = None
    product_condition: ProductCondition | None = None