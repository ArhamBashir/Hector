from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Interval
from sqlalchemy import orm
import io
import csv

from ... import schemas
from ...db import models
from .. import deps

router = APIRouter()


@router.get("/dashboard", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Retrieve dashboard statistics with updated logic.
    """
    if current_user.role not in [models.UserRole.manager, models.UserRole.admin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )

    # Subquery to calculate the total target cost for each sourcing ID
    total_target_cost_subquery = (
        db.query(
            models.SourcingItem.sourcing_id,
            func.sum(models.MasterProduct.target_cost_per_unit * models.SourcingItem.quantity_needed).label("total_target")
        )
        .join(models.MasterProduct, models.SourcingItem.sku == models.MasterProduct.sku)
        .group_by(models.SourcingItem.sourcing_id)
        .subquery()
    )
    
    # --- UPDATED EFFICIENCY LOGIC ---
    # Main query to calculate efficiency, now filters for Purchased or Dropshipped
    efficiency_query = (
        db.query(
            models.SourcingID.sourcer_id,
            (total_target_cost_subquery.c.total_target - 
            (models.SourcingID.sellers_price + models.SourcingID.shipping_price + models.SourcingID.tax)).label("efficiency")
        )
        .join(total_target_cost_subquery, models.SourcingID.id == total_target_cost_subquery.c.sourcing_id)
        .filter(models.SourcingID.status.in_([models.SourcingItemStatus.Purchased, models.SourcingItemStatus.Dropshipped]))
    )

    # Performance by Sourcer
    sourcer_performance_query = (
        efficiency_query.add_columns(models.User.email)
        .join(models.User, models.SourcingID.sourcer_id == models.User.id)
        .group_by(models.User.email)
        .with_entities(models.User.email, func.sum(efficiency_query.subquery().c.efficiency))
        .all()
    )
    
    performance_by_sourcer = [
        schemas.SourcerPerformance(sourcer_email=email, total_savings=savings if savings else 0)
        for email, savings in sourcer_performance_query
    ]
    total_company_savings = sum(p.total_savings for p in performance_by_sourcer)

    sourcing_ids_per_sourcer = db.query(models.User.email, func.count(models.SourcingID.id)).join(
        models.SourcingID, models.User.id == models.SourcingID.sourcer_id
    ).group_by(models.User.email).all()

    sourcing_ids_per_purchaser = db.query(models.User.email, func.count(models.SourcingID.id)).join(
        models.SourcingID, models.User.id == models.SourcingID.purchaser_id
    ).filter(models.SourcingID.purchaser_id.isnot(None)).group_by(models.User.email).all()

    avg_response_timedelta = db.query(
        func.avg(models.SourcingID.assigned_at - models.SourcingID.created_at)
    ).filter(models.SourcingID.assigned_at.isnot(None)).scalar()
    
    avg_response_hours = (avg_response_timedelta.total_seconds() / 3600) if avg_response_timedelta else None

    return schemas.DashboardStats(
        total_company_savings=total_company_savings,
        performance_by_sourcer=performance_by_sourcer,
        sourcing_ids_per_sourcer=[schemas.CountByUser(user_email=email, count=count) for email, count in sourcing_ids_per_sourcer],
        sourcing_ids_per_purchaser=[schemas.CountByUser(user_email=email, count=count) for email, count in sourcing_ids_per_purchaser],
        avg_response_time_hours=avg_response_hours,
        efficiency_by_market=[], 
        efficiency_by_category=[],
    )

@router.get("/dashboard/export")
def export_dashboard_stats_to_csv(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Export detailed sourcing data to a CSV file.
    """
    if current_user.role not in [models.UserRole.manager, models.UserRole.admin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    query_result = (
        db.query(
            models.SourcingID.id,
            models.SourcingID.created_at,
            models.SourcingID.assigned_at,
            models.SourcingItem.product_name,
            models.SourcingItem.sku,
            models.SourcingID.market,
            models.SourcingItem.category,
            models.SourcingID.status,
            (models.SourcingID.sellers_price + models.SourcingID.shipping_price + models.SourcingID.tax).label("total_actual_cost")
        )
        .join(models.SourcingItem, models.SourcingID.id == models.SourcingItem.sourcing_id)
        .all()
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "SourcingID", "CreatedAt", "AssignedAt", "ProductName", "SKU", 
        "Market", "Category", "Status", "TotalActualCost"
    ])
    for row in query_result:
        writer.writerow(row)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sourcing_report.csv"}
    )
    
@router.get("/sourcer/me", response_model=schemas.SourcerDashboardStats)
def get_sourcer_stats(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Retrieve detailed dashboard statistics for the current sourcer.
    """
    if current_user.role != models.UserRole.sourcer:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Get all requests for the current sourcer
    requests = db.query(models.SourcingID).filter(
        models.SourcingID.sourcer_id == current_user.id
    ).options(orm.joinedload(models.SourcingID.items)).all()

    total_requests_created = len(requests)
    requests_pending = sum(1 for r in requests if r.status == models.SourcingItemStatus.Pending)
    requests_assigned = sum(1 for r in requests if r.status == models.SourcingItemStatus.Assigned)
    
    purchased_or_dropshipped_requests = [
        r for r in requests if r.status in [models.SourcingItemStatus.Purchased, models.SourcingItemStatus.Dropshipped]
    ]
    requests_purchased = len(purchased_or_dropshipped_requests)

    # --- CORRECTED TOTAL SAVINGS CALCULATION ---
    total_savings = 0
    for r in purchased_or_dropshipped_requests:
        total_target = sum(
            (db.query(models.MasterProduct.target_cost_per_unit).filter(models.MasterProduct.sku == item.sku).scalar() or 0) * item.quantity_needed
            for item in r.items
        )
        total_actual = r.sellers_price + r.shipping_price + r.tax
        total_savings += (total_target - total_actual)
    
    # Get 5 most recent requests and calculate their individual savings
    recent_requests_query = requests[:5] # Assumes requests are ordered by date, let's make sure
    recent_requests_query = db.query(models.SourcingID).filter(
        models.SourcingID.sourcer_id == current_user.id
    ).order_by(models.SourcingID.created_at.desc()).limit(5).all()

    recent_requests = []
    for r in recent_requests_query:
        savings = None
        if r.status in [models.SourcingItemStatus.Purchased, models.SourcingItemStatus.Dropshipped]:
            total_target = sum(
                (db.query(models.MasterProduct.target_cost_per_unit).filter(models.MasterProduct.sku == item.sku).scalar() or 0) * item.quantity_needed
                for item in r.items
            )
            total_actual = r.sellers_price + r.shipping_price + r.tax
            savings = total_target - total_actual

        recent_requests.append(schemas.RecentSourcingRequest(
            id=r.id,
            status=r.status,
            created_at=r.created_at,
            items=r.items,
            savings=savings
        ))

    return schemas.SourcerDashboardStats(
        total_requests_created=total_requests_created,
        total_savings=total_savings,
        requests_pending=requests_pending,
        requests_assigned=requests_assigned,
        requests_purchased=requests_purchased,
        recent_requests=recent_requests
    )

@router.get("/purchaser/me", response_model=schemas.PurchaserDashboardStats)
def get_purchaser_stats(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    if current_user.role != models.UserRole.purchaser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    requests_assigned = db.query(models.SourcingID).filter(
        models.SourcingID.purchaser_id == current_user.id
    ).count()

    awaiting_tracking = db.query(models.SourcingID).filter(
        models.SourcingID.purchaser_id == current_user.id,
        models.SourcingID.tracking_status == models.TrackingStatus.Awaiting
    ).count()

    items_purchased = db.query(models.SourcingID).filter(
        models.SourcingID.purchaser_id == current_user.id,
        models.SourcingID.status == models.SourcingItemStatus.Purchased
    ).count()

    return schemas.PurchaserDashboardStats(
        requests_assigned=requests_assigned,
        awaiting_tracking=awaiting_tracking,
        items_purchased=items_purchased
    )