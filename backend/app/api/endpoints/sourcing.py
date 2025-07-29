from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

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
    if current_user.role != models.UserRole.sourcer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    sourcing_obj = models.SourcingID(
        sourcer_id=current_user.id,
        created_at=datetime.now(timezone.utc),
        seller_name=sourcing_in.seller_name,
        listing_link=sourcing_in.listing_link,
        market=sourcing_in.market,
        origin=sourcing_in.origin,
        sellers_price=sourcing_in.sellers_price,
        shipping_price=sourcing_in.shipping_price,
        tax=sourcing_in.tax,
    )
    db.add(sourcing_obj)
    db.flush()

    target_total = Decimal("0")
    for item_in in sourcing_in.items:
        payload = item_in.model_dump()
        unit_target = Decimal(str(payload.get("target_cost_per_unit", 0)))
        qty = Decimal(str(payload.get("quantity_needed", 1)))
        target_total += unit_target * qty

        db.add(models.SourcingItem(
            **payload,
            sourcing_id=sourcing_obj.id
        ))

    actual_total = Decimal(str(sourcing_in.sellers_price or 0)) \
                 + Decimal(str(sourcing_in.shipping_price or 0)) \
                 + Decimal(str(sourcing_in.tax or 0))

    sourcing_obj.target_total = target_total
    sourcing_obj.savings = target_total - actual_total

    db.commit()
    db.refresh(sourcing_obj)
    return sourcing_obj


@router.get("/pending", response_model=List[schemas.SourcingID])
def list_pending_requests(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    if current_user.role != models.UserRole.purchaser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    return db.query(models.SourcingID).filter(
        models.SourcingID.status == models.SourcingItemStatus.Pending
    ).all()


@router.post("/{sourcing_id}/assign", response_model=schemas.SourcingID)
def assign_request_to_self(
    sourcing_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    if current_user.role != models.UserRole.purchaser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    sourcing_request = db.query(models.SourcingID).filter(models.SourcingID.id == sourcing_id).first()
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
    sourcing_request = db.query(models.SourcingID).filter(models.SourcingID.id == sourcing_id).first()
    if not sourcing_request:
        raise HTTPException(status_code=404, detail="Sourcing ID not found")

    if current_user.role == models.UserRole.purchaser and sourcing_request.purchaser_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this request")

    update_data = sourcing_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sourcing_request, field, value)

    sourcing_request.purchaser_action_time = datetime.now(timezone.utc)

    db.add(sourcing_request)
    db.commit()
    db.refresh(sourcing_request)
    return sourcing_request


@router.patch("/items/{item_id}", response_model=schemas.SourcingItem)
def update_sourcing_item(
    item_id: int,
    item_in: schemas.SourcingItemUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    item_obj = db.query(models.SourcingItem).join(models.SourcingID).filter(
        models.SourcingItem.id == item_id
    ).first()

    if not item_obj:
        raise HTTPException(status_code=404, detail="Sourcing item not found")

    order = item_obj.sourcing_order
    if current_user.role == models.UserRole.purchaser and order.purchaser_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this item")
    if current_user.role == models.UserRole.sourcer and order.sourcer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this item")

    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item_obj, field, value)

    item_obj.sourcing_order.purchaser_action_time = datetime.now(timezone.utc)

    db.add(item_obj)
    db.commit()
    db.refresh(item_obj)
    return item_obj


@router.get("/assigned/me", response_model=List[schemas.SourcingID])
def list_my_assigned_requests(
    status_filter: Optional[str] = None,
    start_date: Optional[datetime] = Query(None, description="Start date for filtering"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    if current_user.role != models.UserRole.purchaser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    query = db.query(models.SourcingID).filter(models.SourcingID.purchaser_id == current_user.id)

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
    """
    Get a specific sourcing request by ID.
    Accessible by the sourcer who created it or the assigned purchaser.
    """
    sourcing_request = db.query(models.SourcingID).filter(models.SourcingID.id == sourcing_id).first()

    if not sourcing_request:
        raise HTTPException(status_code=404, detail="Sourcing ID not found")

    # Permissions: sourcer or purchaser assigned to it
    if (
        sourcing_request.sourcer_id != current_user.id
        and sourcing_request.purchaser_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Not authorized to view this request")

    return sourcing_request
