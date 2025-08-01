import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Text,
    Numeric,
    event
)
from decimal import Decimal

from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

# ---------------- Enums ----------------
class UserRole(str, enum.Enum):
    admin = "admin"
    sourcer = "sourcer"
    purchaser = "purchaser"
    manager = "manager"

class ProductType(str, enum.Enum):
    Accessory = "Accessory"
    Console = "Console"
    Game = "Game"
    Handheld = "Handheld"

class Market(str, enum.Enum):
    Mercari = "Mercari"
    eBay = "eBay"
    Facebook = "Facebook"
    Etsy = "Etsy"

class SourcingItemStatus(str, enum.Enum):
    Pending = "Pending"
    Assigned = "Assigned"
    Offer = "Offer"
    Purchased = "Purchased"
    Disapproved = "Disapproved"
    Sold = "Sold"
    Hold = "Hold"
    Seller_Rejected = "Seller Rejected"
    Dropshipped = "Dropshipped"
    Returned = "Returned"

class ProductCondition(str, enum.Enum):
    Excellent = "Excellent"
    Refurbished = "Refurbished"
    Acceptable = "Acceptable"
    Scratched = "Scratched"
    Unacceptable = "Unacceptable"

class DestinationWarehouse(str, enum.Enum):
    Fleetwood = "Fleetwood"
    Lahore = "Lahore"
    Osaka = "Osaka"
    Quebec = "Quebec"
    Sharjah = "Sharjah"
    Customer = "Customer"

class TrackingStatus(str, enum.Enum):
    Awaiting = "Awaiting"
    In_Transit = "In Transit"
    Received = "Received"
    QC = "QC"
    Inventory = "Inventory"

class Carrier(str, enum.Enum):
    FedEx = "FedEx"
    USPS = "USPS"
    UPS = "UPS"

# ---------------- Models ----------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String(60), nullable=False)
    last_name = Column(String(60), nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)

    sourcing_ids = relationship("SourcingID", foreign_keys="SourcingID.sourcer_id", back_populates="sourcer")
    purchased_items = relationship("SourcingID", foreign_keys="SourcingID.purchaser_id", back_populates="purchaser")


class MasterProduct(Base):
    __tablename__ = "master_products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True)
    product_name = Column(String, index=True)
    target_cost_per_unit = Column(Numeric(10, 2), default=0)
    category = Column(String)
    product_type = Column(Enum(ProductType))


class SourcingID(Base):
    __tablename__ = "sourcing_ids"
    id = Column(Integer, primary_key=True, index=True)
    seller_name = Column(String, nullable=True)
    listing_link = Column(String, nullable=True)
    market = Column(Enum(Market), nullable=True)
    origin = Column(String, nullable=True)
    sellers_price = Column(Numeric(10, 2), default=0)
    shipping_price = Column(Numeric(10, 2), default=0)
    tax = Column(Numeric(10, 2), default=0)

    status = Column(Enum(SourcingItemStatus), default=SourcingItemStatus.Pending, index=True)
    market_order_num = Column(String, nullable=True)
    purchase_link = Column(String, nullable=True)
    destination_warehouse = Column(Enum(DestinationWarehouse), nullable=True)
    tracking_status = Column(Enum(TrackingStatus), nullable=True)
    carrier = Column(Enum(Carrier), nullable=True)
    tracking_id = Column(String, nullable=True)
    tracking_link = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    purchaser_action_time = Column(DateTime(timezone=True), nullable=True)
    finalized_at = Column(DateTime(timezone=True), nullable=True)

    sourcer_id = Column(Integer, ForeignKey("users.id"))
    purchaser_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    target_total = Column(Numeric(10, 2), default=0)
    sourced_price = Column(Numeric(10, 2), default=0)
    savings = Column(Numeric(10, 2), default=0)
    is_manual_override = Column(Boolean, default=False)

    sourcer = relationship("User", foreign_keys=[sourcer_id], back_populates="sourcing_ids")
    purchaser = relationship("User", foreign_keys=[purchaser_id], back_populates="purchased_items")
    items = relationship("SourcingItem", back_populates="sourcing_order", cascade="all, delete-orphan")

from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Boolean, Enum, Text
from sqlalchemy.orm import relationship
from ..db.models import ProductType, ProductCondition  # Ensure enums are imported

class SourcingItem(Base):
    __tablename__ = "sourcing_items"
    id = Column(Integer, primary_key=True, index=True)
    sourcing_id = Column(Integer, ForeignKey("sourcing_ids.id"))
    product_id = Column(Integer, ForeignKey("master_products.id"), nullable=True)

    uid = Column(String, nullable=True)
    product_name = Column(String, nullable=False)
    sku = Column(String, index=True, nullable=False)
    quantity_needed = Column(Integer, default=1)
    sourced_price = Column(Numeric(10, 2), default=0)
    product_type = Column(Enum(ProductType))
    category = Column(String)
    sourcer_remarks = Column(Text, nullable=True)
    target_cost_per_unit = Column(Numeric(10, 2), default=0)

    item_target_total = Column(Numeric(10, 2), default=0)

    type_code = Column(String, nullable=True)
    brnd_cod = Column(String, nullable=True)
    model_code = Column(String, nullable=True)
    abbr_code = Column(String, nullable=True)
    color_code = Column(String, nullable=True)
    cnd_code = Column(String, nullable=True)
    regular_price = Column(Numeric(10, 2), nullable=True)
    price = Column(Numeric(10, 2), nullable=True)

    shipping_charges = Column(Numeric(10, 2), default=0)
    tax = Column(Numeric(10, 2), default=0)

    sku_efficiency = Column(Numeric(10, 2), default=0)

    tested = Column(Boolean, default=False)
    product_condition = Column(Enum(ProductCondition), nullable=True)

    sourcing_order = relationship("SourcingID", back_populates="items")
    product = relationship("MasterProduct", backref="sourcing_items", lazy="joined")
# ---------------- Event Listeners ----------------
from sqlalchemy import select
@event.listens_for(SourcingItem, "after_insert")
@event.listens_for(SourcingItem, "after_update")
@event.listens_for(SourcingItem, "after_delete")
def update_sourcing_totals(mapper, connection, target):
    sourcing_id = target.sourcing_id
    sourcing_table = SourcingID.__table__
    item_table = SourcingItem.__table__

    sourcing_row = connection.execute(
        select(sourcing_table).where(sourcing_table.c.id == sourcing_id)
    ).fetchone()

    if sourcing_row and not sourcing_row.is_manual_override:
        items = connection.execute(
            select(item_table).where(item_table.c.sourcing_id == sourcing_id)
        ).fetchall()

        total_target = sum(
            Decimal(i.target_cost_per_unit or 0) * (i.quantity_needed or 1)
            for i in items
        )
        # include sellers_price, shipping_price, and tax
        total_actual = sum(
            (Decimal(i.sourced_price or 0) + Decimal(i.shipping_charges or 0) + Decimal(i.tax or 0))
            * Decimal(i.quantity_needed or 1)
            for i in items
        )
        savings = total_target - total_actual

        connection.execute(
            sourcing_table.update()
            .where(sourcing_table.c.id == sourcing_id)
            .values(
                target_total=total_target,
                sourced_price=total_actual,
                savings=savings
            )
        )