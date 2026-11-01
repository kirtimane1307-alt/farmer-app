"""Financial Summary & Profit/Loss API endpoints for Phase 15."""

from datetime import date
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.finance import FinancialSummaryResponse
from app.services.finance_service import FinanceService

finance_router = APIRouter()


@finance_router.get(
    "/financial-summary",
    response_model=FinancialSummaryResponse,
    tags=["Financial Overview"],
    summary="Get comprehensive farm financial telemetry and calculated profit/loss",
)
@finance_router.get(
    "/sales/financial-summary",
    response_model=FinancialSummaryResponse,
    tags=["Financial Overview", "Sales"],
    summary="Financial summary alias under /sales prefix",
)
def get_financial_summary(
    farm_id: Optional[UUID] = Query(None, description="Optional farm estate filter"),
    start_date: Optional[date] = Query(None, description="Filter transactions starting from date"),
    end_date: Optional[date] = Query(None, description="Filter transactions ending on date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Compute authoritative financial summary:
    - Total Sales Revenue (Produce sales after discounts)
    - Total Other Income (Non-produce farm revenue)
    - Total Recorded Expenses (Phase 12 Farm Expenses)
    - Net Profit or Loss (Recorded Income - Recorded Expenses)
    - Outstanding Receivables & Payables
    - Monthly timeline comparing Revenue vs Expenses
    """
    return FinanceService.get_financial_summary(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
    )
