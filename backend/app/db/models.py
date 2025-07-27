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
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

# Enum classes for fields with specific choices
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


# 1. User Table Model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)

    sourcing_ids = relationship("SourcingID", foreign_keys="SourcingID.sourcer_id", back_populates="sourcer")
    purchased_items = relationship("SourcingID", foreign_keys="SourcingID.purchaser_id", back_populates="purchaser")


# 2. Master Product List Table Model
class MasterProduct(Base):
    __tablename__ = "master_products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True)
    product_name = Column(String, index=True)
    target_cost_per_unit = Column(Numeric(10, 2))
    category = Column(String)
    product_type = Column(Enum(ProductType))


class SourcingID(Base):
    __tablename__ = "sourcing_ids"
    id = Column(Integer, primary_key=True, index=True)
    
    # --- SOURCER-ENTERED ORDER FIELDS ---
    seller_name = Column(String, nullable=True)
    listing_link = Column(String, nullable=True)
    market = Column(Enum(Market))
    origin = Column(String)
    sellers_price = Column(Numeric(10, 2))
    shipping_price = Column(Numeric(10, 2))
    tax = Column(Numeric(10, 2))
    
    # --- PURCHASER-UPDATED ORDER FIELDS ---
    status = Column(Enum(SourcingItemStatus), default=SourcingItemStatus.Pending, index=True) # <-- MOVED HERE
    market_order_num = Column(String, nullable=True)
    purchase_link = Column(String, nullable=True)
    destination_warehouse = Column(Enum(DestinationWarehouse), nullable=True)
    tracking_status = Column(Enum(TrackingStatus), nullable=True)
    carrier = Column(Enum(Carrier), nullable=True)
    tracking_id = Column(String, nullable=True)
    tracking_link = Column(String, nullable=True)
    
    # User foreign keys & Timestamps
    sourcer_id = Column(Integer, ForeignKey("users.id"))
    purchaser_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    purchaser_action_time = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    sourcer = relationship("User", foreign_keys=[sourcer_id], back_populates="sourcing_ids")
    purchaser = relationship("User", foreign_keys=[purchaser_id], back_populates="purchased_items")
    items = relationship("SourcingItem", back_populates="sourcing_order", cascade="all, delete-orphan")


# 4. Sourcing Item Table Model
class SourcingItem(Base):
    __tablename__ = "sourcing_items"
    id = Column(Integer, primary_key=True, index=True)
    sourcing_id = Column(Integer, ForeignKey("sourcing_ids.id"))

    # --- SOURCER-ENTERED ITEM FIELDS ---
    product_name = Column(String)
    sku = Column(String, index=True)
    quantity_needed = Column(Integer)
    sourced_price = Column(Numeric(10, 2))
    product_type = Column(Enum(ProductType))
    category = Column(String)
    sourcer_remarks = Column(Text, nullable=True)

    # --- PURCHASER-UPDATED ITEM FIELDS ---
    tested = Column(Boolean, default=False)
    product_condition = Column(Enum(ProductCondition), nullable=True)

    # Relationship back to the main order
    sourcing_order = relationship("SourcingID", back_populates="items")

    