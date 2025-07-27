from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from ... import schemas
from ...db import models
from .. import deps

router = APIRouter()


@router.post("/", response_model=schemas.SourcingID)
def create_sourcing_request(
    *,
    sourcing_in: schemas.SourcingIDCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Create new sourcing request with the new data structure.
    """
    if current_user.role != models.UserRole.sourcer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    sourcing_id_obj = models.SourcingID(
        sourcer_id=current_user.id,
        seller_name=sourcing_in.seller_name,
        listing_link=sourcing_in.listing_link,
        market=sourcing_in.market,
        origin=sourcing_in.origin,
        sellers_price=sourcing_in.sellers_price,
        shipping_price=sourcing_in.shipping_price,
        tax=sourcing_in.tax
    )
    db.add(sourcing_id_obj)
    db.commit()
    db.refresh(sourcing_id_obj)

    for item_in in sourcing_in.items:
        item_obj = models.SourcingItem(**item_in.model_dump(), sourcing_id=sourcing_id_obj.id)
        db.add(item_obj)
    
    db.commit()
    db.refresh(sourcing_id_obj)
    return sourcing_id_obj


@router.get("/pending", response_model=List[schemas.SourcingID])
def list_pending_requests(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    List all pending sourcing requests for purchasers.
    """
    if current_user.role != models.UserRole.purchaser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    # CORRECTED FILTER
    pending_requests = db.query(models.SourcingID).filter(models.SourcingID.status == models.SourcingItemStatus.Pending).all()
    return pending_requests


@router.post("/{sourcing_id}/assign", response_model=schemas.SourcingID)
def assign_request_to_self(
    sourcing_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Assign a sourcing request to the current purchaser.
    """
    if current_user.role != models.UserRole.purchaser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    sourcing_request = db.query(models.SourcingID).filter(models.SourcingID.id == sourcing_id).first()
    if not sourcing_request:
        raise HTTPException(status_code=404, detail="Sourcing ID not found")
    
    # CORRECTED CHECK
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
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Update a sourcing order's status and tracking info. Accessible by the assigned purchaser.
    """
    sourcing_request = db.query(models.SourcingID).filter(models.SourcingID.id == sourcing_id).first()
    if not sourcing_request:
        raise HTTPException(status_code=404, detail="Sourcing ID not found")
    if sourcing_request.purchaser_id != current_user.id:
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
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Update item-specific details (tested, condition). Accessible by the assigned purchaser.
    """
    item_obj = db.query(models.SourcingItem).join(models.SourcingID).filter(
        models.SourcingItem.id == item_id
    ).first()

    if not item_obj:
        raise HTTPException(status_code=404, detail="Sourcing item not found")
    if item_obj.sourcing_order.purchaser_id != current_user.id:
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
    status: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    List sourcing requests assigned to the current purchaser, with optional status filter.
    """
    if current_user.role != models.UserRole.purchaser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    query = db.query(models.SourcingID).filter(
        models.SourcingID.purchaser_id == current_user.id
    )

    if status:
        query = query.filter(models.SourcingID.status == status)

    assigned_requests = query.all()
    return assigned_requests


@router.get("/{sourcing_id}", response_model=schemas.SourcingID)
def read_sourcing_request(
    sourcing_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Get a specific sourcing request by ID. Only accessible by the assigned purchaser.
    """
    sourcing_request = db.query(models.SourcingID).filter(
        models.SourcingID.id == sourcing_id,
        models.SourcingID.purchaser_id == current_user.id
    ).first()

    if not sourcing_request:
        raise HTTPException(status_code=404, detail="Sourcing ID not found or not assigned to you")
        
    return sourcing_request