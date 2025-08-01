from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from ... import schemas
from ...db import models
from .. import deps

router = APIRouter()



@router.post("/", response_model=schemas.SourcingID)
def create_sourcing_request(
    *,
    sourcing_in: schemas.SourcingIDCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    if current_user.role not in [models.UserRole.sourcer, models.UserRole.purchaser]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    # 1) Create order record and persist it immediately
    order = models.SourcingID(
        sourcer_id     = current_user.id,
        created_at     = datetime.now(timezone.utc),
        seller_name    = sourcing_in.seller_name,
        listing_link   = sourcing_in.listing_link,
        market         = sourcing_in.market,
        origin         = sourcing_in.origin,
        sellers_price  = sourcing_in.sellers_price,
        shipping_price = sourcing_in.shipping_price,
        tax            = sourcing_in.tax,
        status         = models.SourcingItemStatus.Pending
    )
    db.add(order)
    db.flush()   # ← now order.id is assigned and it’s in the session

    if current_user.role == models.UserRole.purchaser:
        order.purchaser_id = current_user.id
        order.status       = models.SourcingItemStatus.Assigned

# 2) Compute total_target as before...
    total_target = sum(
        Decimal(str(item.target_cost_per_unit)) * Decimal(item.quantity_needed or 1)
        for item in sourcing_in.items
    )
    order.target_total = total_target

    # But actual cost should be the order-level sellers_price + shipping_price + tax
    actual_cost = (
       order.sellers_price
        + order.shipping_price
        + order.tax
    )
    order.sourced_price = actual_cost
    order.savings       = Decimal(total_target) - Decimal(actual_cost)

    # 3) Create items
    for item_in in sourcing_in.items:
        target   = Decimal(str(item_in.target_cost_per_unit or 0))
        sourced = Decimal(str(item_in.sourced_price or 0))
        db.add(models.SourcingItem(
            sourcing_id         = order.id,
            product_name        = item_in.product_name,
            sku                 = item_in.sku,
            quantity_needed     = item_in.quantity_needed,
            target_cost_per_unit= item_in.target_cost_per_unit,
            sourced_price       = item_in.sourced_price  or Decimal("0"),
            shipping_charges    = item_in.shipping_charges or Decimal("0"),
            tax                 = item_in.tax or Decimal("0"),
            product_type        = item_in.product_type,
            category            = item_in.category,
            sku_efficiency      = target - sourced,
        ))

    db.commit()
    db.refresh(order)
    return order



@router.get("/pending", response_model=List[schemas.SourcingID])
def list_pending_requests(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    if current_user.role != models.UserRole.purchaser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    return (
        db.query(models.SourcingID)
        .options(joinedload(models.SourcingID.items))
        .filter(models.SourcingID.status == models.SourcingItemStatus.Pending)
        .all()
    )

@router.post("/{sourcing_id}/assign", response_model=schemas.SourcingID)
def assign_request_to_self(
    sourcing_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    if current_user.role != models.UserRole.purchaser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    sourcing_request = (
        db.query(models.SourcingID)
        .options(joinedload(models.SourcingID.items))
        .filter(models.SourcingID.id == sourcing_id)
        .first()
    )
    if not sourcing_request:
        raise HTTPException(status_code=404, detail="Sourcing ID not found")
    if sourcing_request.status != models.SourcingItemStatus.Pending:
        raise HTTPException(status_code=400, detail="Request is not pending and cannot be assigned")
    sourcing_request.status = models.SourcingItemStatus.Assigned
    sourcing_request.purchaser_id = current_user.id
    sourcing_request.assigned_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sourcing_request)
    return sourcing_request


@router.put("/{sourcing_id}", response_model=schemas.SourcingID)
def update_sourcing_order_by_purchaser(
    sourcing_id: int,
    sourcing_in: schemas.SourcingIDUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    order = (
        db.query(models.SourcingID)
          .options(joinedload(models.SourcingID.items))
          .filter(models.SourcingID.id == sourcing_id)
          .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Sourcing ID not found")
    if current_user.role == models.UserRole.purchaser and order.purchaser_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this request")

    data = sourcing_in.model_dump(exclude_unset=True)
    if "savings" in data:
        order.is_manual_override = True
    if "is_manual_override" in data:
        order.is_manual_override = data.pop("is_manual_override")

    # apply incoming fields
    for field, val in data.items():
        if hasattr(order, field):
            setattr(order, field, val)

    # recompute totals immediately on update
    total_target = sum(
        Decimal(str(item.target_cost_per_unit or 0)) * Decimal(item.quantity_needed or 1)
        for item in order.items
    )
    total_actual = (
        Decimal(str(order.sellers_price or 0))
      + Decimal(str(order.shipping_price or 0))
      + Decimal(str(order.tax or 0))
    )

    order.target_total  = total_target
    order.sourced_price = total_actual
    order.savings       = total_target - total_actual

    order.purchaser_action_time = datetime.now(timezone.utc)

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.patch("/items/{item_id}", response_model=schemas.SourcingItem)
def update_sourcing_item(
    item_id: int,
    item_in: schemas.SourcingItemUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    item_obj = (
        db.query(models.SourcingItem)
          .join(models.SourcingID)
          .filter(models.SourcingItem.id == item_id)
          .first()
    )
    if not item_obj:
        raise HTTPException(status_code=404, detail="Sourcing item not found")
    order = item_obj.sourcing_order

    # Get all PATCHed values (only sent fields)
    update_data = item_in.model_dump(exclude_unset=True)

    # If SKU is present, validate and auto-populate only missing (not user-sent) fields from MasterProduct
    if "sku" in update_data:
        prod = db.query(models.MasterProduct).filter_by(sku=update_data["sku"]).first()
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product with SKU {update_data['sku']} not found")
        # Only set from master if not PATCHed by user and only if attribute exists
        possible_fields = [
            "product_name", "type_code", "brnd_cod", "model_code", "abbr_code",
            "color_code", "cnd_code", "regular_price", "price",
            "target_cost_per_unit", "product_type", "category"
        ]
        for k in possible_fields:
            if hasattr(prod, k):
                update_data.setdefault(k, getattr(prod, k))
        update_data["product_id"] = prod.id
        update_data["uid"] = prod.id

    # Apply all user PATCHed values (overwrite everything)
    for field, value in update_data.items():
        setattr(item_obj, field, value)

    # --- Recalculate per-item totals & efficiency ---
        item_obj.item_target_total = (
        Decimal(item_obj.target_cost_per_unit or 0)
        * Decimal(item_obj.quantity_needed or 1)
    )
    item_obj.sku_efficiency = (
        Decimal(item_obj.item_target_total or 0)
        - (Decimal(item_obj.sourced_price or 0) + Decimal(item_obj.shipping_charges or 0) + Decimal(item_obj.tax or 0))
    )
    item_obj.shipping_charges = item_obj.shipping_charges or Decimal("0")
    item_obj.tax = item_obj.tax or Decimal("0")



    # update order-level if no manual override
    order = item_obj.sourcing_order
    order.purchaser_action_time = datetime.now(timezone.utc)
    if not order.is_manual_override:
        order.target_total = sum(
            Decimal(i.target_cost_per_unit or 0) * Decimal(i.quantity_needed or 1)
            for i in order.items
        )
        order.sourced_price = sum(
            (Decimal(i.sourced_price or 0) + Decimal(i.shipping_charges or 0) + Decimal(i.tax or 0))
            * Decimal(i.quantity_needed or 1)
            for i in order.items
        )
        order.savings = order.target_total - order.sourced_price

    db.add(item_obj)
    db.commit()
    db.refresh(item_obj)
    return item_obj

@router.get("/assigned/me", response_model=List[schemas.SourcingID])
def list_my_assigned_requests(
    status_filter: Optional[str] = None,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    if current_user.role != models.UserRole.purchaser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    query = (
        db.query(models.SourcingID)
        .options(joinedload(models.SourcingID.items))
        .filter(models.SourcingID.purchaser_id == current_user.id)
    )
    if status_filter:
        query = query.filter(models.SourcingID.status == status_filter)
    if start_date and end_date:
        query = query.filter(models.SourcingID.created_at.between(start_date, end_date))
    elif start_date:
        query = query.filter(models.SourcingID.created_at >= start_date)
    elif end_date:
        query = query.filter(models.SourcingID.created_at <= end_date)
    return query.all()


@router.get("/{sourcing_id}", response_model=schemas.SourcingID)
def read_sourcing_request(
    sourcing_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    sourcing_request = (
        db.query(models.SourcingID)
        .options(joinedload(models.SourcingID.items))
        .filter(models.SourcingID.id == sourcing_id)
        .first()
    )
    # allow purchasers to view pending orders
    if current_user.role == models.UserRole.purchaser and sourcing_request.status == models.SourcingItemStatus.Pending:
        return sourcing_request
    if sourcing_request.sourcer_id != current_user.id and sourcing_request.purchaser_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this request")
    return sourcing_request


@router.post("/{sourcing_id}/items", response_model=schemas.SourcingItem)
def add_sourcing_item(
    sourcing_id: int,
    item_in: schemas.SourcingItemCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    # Check if sourcing order exists
    sourcing_order = db.query(models.SourcingID).filter(models.SourcingID.id == sourcing_id).first()
    if not sourcing_order:
        raise HTTPException(status_code=404, detail="Sourcing order not found")

    # Authorization (optional: restrict to sourcer/purchaser)
    if current_user.role not in [models.UserRole.sourcer, models.UserRole.purchaser]:
        raise HTTPException(status_code=403, detail="Not authorized to add items")

    # Get product by SKU
    prod = db.query(models.MasterProduct).filter_by(sku=item_in.sku).first()
    if not prod:
        raise HTTPException(status_code=404, detail=f"Product with SKU {item_in.sku} not found")

    # Extract fields with defaults
    quantity_needed = item_in.quantity_needed or 1
    sourced_price = item_in.sourced_price or 0
    shipping_charges = item_in.shipping_charges or 0
    product_condition = item_in.product_condition or "Excellent"

    # Create new sourcing item
    new_item = models.SourcingItem(
        sourcing_id=sourcing_id,
        product_id=prod.id,
        product_name=prod.product_name,
        target_cost_per_unit=prod.target_cost_per_unit,
        product_type=prod.product_type,
        category=prod.category,
        sku=item_in.sku,
        quantity_needed=quantity_needed,
        sourced_price=sourced_price,
        shipping_charges=shipping_charges,
        product_condition=product_condition,
        sku_efficiency=(sourced_price - prod.target_cost_per_unit)
    )

    db.add(new_item)
    db.flush()  # So sourcing_order.items includes the new item

    # Recalculate totals if no manual override
    if not sourcing_order.is_manual_override:
        sourcing_order.target_total = sum(
            (i.target_cost_per_unit or 0) * (i.quantity_needed or 1) for i in sourcing_order.items
        )
        sourcing_order.total_actual_cost = sum(
            ((i.sourced_price or 0) + (i.shipping_charges or 0) + (i.tax or 0)) * (i.quantity_needed or 1)
            for i in sourcing_order.items
        )
        sourcing_order.savings = sourcing_order.target_total - sourcing_order.total_actual_cost
        db.add(sourcing_order)

    db.commit()
    db.refresh(new_item)

    return new_item


@router.delete("/items/{item_id}", status_code=204)
def delete_sourcing_item(
    item_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    item = db.query(models.SourcingItem).get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    order = item.sourcing_order
    # authorization: only sourcer or purchaser on that order
    if current_user.id not in [order.sourcer_id, order.purchaser_id]:
        raise HTTPException(status_code=403, detail="Not authorized to delete item")
    db.delete(item)
    db.flush()
    # update totals if no manual override
    if not order.is_manual_override:
        order.target_total = sum(
            Decimal(i.target_cost_per_unit or 0) * Decimal(i.quantity_needed or 1)
            for i in order.items
        )
        order.sourced_price = sum(
            (Decimal(i.sourced_price or 0) + Decimal(i.shipping_charges or 0) + Decimal(i.tax or 0))
            * Decimal(i.quantity_needed or 1)
            for i in order.items
        )
        order.savings = order.target_total - order.sourced_price
        db.add(order)
    db.commit()
    return