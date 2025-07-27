from pydantic import BaseModel
from typing import List
from datetime import datetime

class SourcerPerformance(BaseModel):
    sourcer_email: str
    total_savings: float

class CountByUser(BaseModel):
    user_email: str

class EfficiencyBreakdown(BaseModel):
    dimension: str  # e.g., "Market", "Category"
    value: str      # e.g., "eBay", "Video Games"
    total_savings: float

class DashboardStats(BaseModel):
    total_company_savings: float
    performance_by_sourcer: List[SourcerPerformance]
    sourcing_ids_per_sourcer: List[CountByUser]
    sourcing_ids_per_purchaser: List[CountByUser]
    avg_response_time_hours: float | None = None
    efficiency_by_market: List[EfficiencyBreakdown]
    efficiency_by_category: List[EfficiencyBreakdown]

# (Keep all other classes in the file)
class ItemSummary(BaseModel):
    product_name: str

    class Config:
        from_attributes = True
class RecentSourcingRequest(BaseModel):
    id: int
    status: str
    created_at: datetime
    items: List[ItemSummary] 
    savings: float | None = None

class SourcerDashboardStats(BaseModel):
    total_requests_created: int
    total_savings: float
    requests_pending: int
    requests_assigned: int
    requests_purchased: int
    recent_requests: List[RecentSourcingRequest] 

class PurchaserDashboardStats(BaseModel):
    requests_assigned: int
    awaiting_tracking: int
    items_purchased: int    


