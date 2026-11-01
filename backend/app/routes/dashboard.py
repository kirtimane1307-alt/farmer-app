"""API router for Phase 17: Dashboard Analytics + Recharts."""

from datetime import date
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.dashboard import (
    DashboardAnalyticsResponse,
    DashboardKpiSummary,
    DashboardFinancialOverview,
    IncomeExpenseTrendItem,
    ExpenseCategoryItem,
    AttendanceTrendItem,
    CropDistributionItem,
    HarvestTrendItem,
    DashboardUpcomingActivity,
)
from app.services.dashboard_service import DashboardService

dashboard_router = APIRouter()


@dashboard_router.get(
    "/analytics",
    response_model=DashboardAnalyticsResponse,
    summary="Get full consolidated farm dashboard analytics and charts",
    description="Computes KPIs, P&L, Recharts trends, crop allocations, and upcoming activities with date and farm filters.",
)
@dashboard_router.get(
    "",
    response_model=DashboardAnalyticsResponse,
    include_in_schema=False,
)
def get_dashboard_analytics(
    farm_id: Optional[UUID] = Query(None, description="Optional filter by specific owned farm"),
    start_date: Optional[date] = Query(None, description="Filter metrics starting from date"),
    end_date: Optional[date] = Query(None, description="Filter metrics ending on date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch complete farm analytics dataset for dashboard rendering."""
    return DashboardService.get_dashboard_analytics(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
    )


@dashboard_router.get(
    "/summary",
    response_model=DashboardKpiSummary,
    summary="Get summary statistic cards",
    description="Returns top operational and financial summary KPI metrics.",
)
def get_dashboard_summary(
    farm_id: Optional[UUID] = Query(None, description="Optional farm filter"),
    start_date: Optional[date] = Query(None, description="Filter start date"),
    end_date: Optional[date] = Query(None, description="Filter end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve top-level KPI cards."""
    analytics = DashboardService.get_dashboard_analytics(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
    )
    return analytics.kpi


@dashboard_router.get(
    "/financial-overview",
    response_model=DashboardFinancialOverview,
    summary="Get financial statement and profit/loss overview",
    description="Returns gross sales revenue, other income, operating expenses, receivables, and payables.",
)
def get_dashboard_financial_overview(
    farm_id: Optional[UUID] = Query(None, description="Optional farm filter"),
    start_date: Optional[date] = Query(None, description="Filter start date"),
    end_date: Optional[date] = Query(None, description="Filter end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve detailed financial overview."""
    analytics = DashboardService.get_dashboard_analytics(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
    )
    return analytics.financial_overview


@dashboard_router.get(
    "/income-expense-trend",
    response_model=List[IncomeExpenseTrendItem],
    summary="Get periodic revenue vs expenses trend",
    description="Returns chronological monthly/periodic income and operating expenses for Recharts visual comparison.",
)
def get_income_expense_trend(
    farm_id: Optional[UUID] = Query(None, description="Optional farm filter"),
    start_date: Optional[date] = Query(None, description="Filter start date"),
    end_date: Optional[date] = Query(None, description="Filter end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve periodic financial performance trend."""
    analytics = DashboardService.get_dashboard_analytics(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
    )
    return analytics.income_expense_trend


@dashboard_router.get(
    "/expense-breakdown",
    response_model=List[ExpenseCategoryItem],
    summary="Get operational expenses grouped by category",
    description="Returns categorized expenses with amounts and percentage shares for donut/pie charts.",
)
def get_expense_breakdown(
    farm_id: Optional[UUID] = Query(None, description="Optional farm filter"),
    start_date: Optional[date] = Query(None, description="Filter start date"),
    end_date: Optional[date] = Query(None, description="Filter end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve categorized expense breakdown."""
    analytics = DashboardService.get_dashboard_analytics(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
    )
    return analytics.expense_breakdown


@dashboard_router.get(
    "/attendance-trend",
    response_model=List[AttendanceTrendItem],
    summary="Get workforce attendance numbers over time",
    description="Returns daily muster roll counts (present, absent, leave) for Recharts trend charts.",
)
def get_attendance_trend(
    farm_id: Optional[UUID] = Query(None, description="Optional farm filter"),
    start_date: Optional[date] = Query(None, description="Filter start date"),
    end_date: Optional[date] = Query(None, description="Filter end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve daily attendance trends."""
    analytics = DashboardService.get_dashboard_analytics(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
    )
    return analytics.attendance_trend


@dashboard_router.get(
    "/crop-distribution",
    response_model=List[CropDistributionItem],
    summary="Get cultivated crop land allocation",
    description="Returns planted acreage and variety share for Recharts pie and bar charts.",
)
def get_crop_distribution(
    farm_id: Optional[UUID] = Query(None, description="Optional farm filter"),
    start_date: Optional[date] = Query(None, description="Filter start date"),
    end_date: Optional[date] = Query(None, description="Filter end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve crop distribution metrics."""
    analytics = DashboardService.get_dashboard_analytics(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
    )
    return analytics.crop_distribution


@dashboard_router.get(
    "/harvest-trend",
    response_model=List[HarvestTrendItem],
    summary="Get crop yield harvest trend over time",
    description="Returns chronological harvest quantities and quality grades.",
)
def get_harvest_trend(
    farm_id: Optional[UUID] = Query(None, description="Optional farm filter"),
    start_date: Optional[date] = Query(None, description="Filter start date"),
    end_date: Optional[date] = Query(None, description="Filter end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve harvest yield records over time."""
    analytics = DashboardService.get_dashboard_analytics(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
    )
    return analytics.harvest_trend


@dashboard_router.get(
    "/upcoming-activities",
    response_model=List[DashboardUpcomingActivity],
    summary="Get upcoming farm calendar operations",
    description="Returns upcoming scheduled agricultural activities from Phase 16 Calendar.",
)
def get_upcoming_activities(
    farm_id: Optional[UUID] = Query(None, description="Optional farm filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve upcoming scheduled calendar events."""
    analytics = DashboardService.get_dashboard_analytics(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
    )
    return analytics.upcoming_activities
