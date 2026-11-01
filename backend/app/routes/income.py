"""Other Farm Income API endpoints for Phase 15: Sales, Income & Profit/Loss Management."""

from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.income import (
    IncomeCreate,
    IncomeUpdate,
    IncomeResponse,
    IncomeSummaryResponse,
    IncomeDeleteResponse,
)
from app.services.income_service import IncomeService

income_router = APIRouter()
income_convenience_router = APIRouter()


@income_router.get(
    "",
    response_model=List[IncomeResponse],
    summary="List all other farm income records with multi-criteria filters",
)
def get_incomes(
    farm_id: Optional[UUID] = Query(None, description="Filter by farm estate UUID"),
    category: Optional[str] = Query(None, description="Filter by category code"),
    start_date: Optional[date] = Query(None, description="Filter records starting from date"),
    end_date: Optional[date] = Query(None, description="Filter records ending on date"),
    search: Optional[str] = Query(
        None, description="Search term matching description, source, reference, or notes"
    ),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(100, ge=1, le=200, description="Pagination page limit"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve other farm income entries belonging to the authenticated farm owner."""
    return IncomeService.list_incomes(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        category=category,
        start_date=start_date,
        end_date=end_date,
        search=search,
        skip=skip,
        limit=limit,
    )


@income_router.get(
    "/summary",
    response_model=IncomeSummaryResponse,
    summary="Get other farm income summary totals and category breakdown",
)
def get_income_summary(
    farm_id: Optional[UUID] = Query(None, description="Optional farm estate filter"),
    start_date: Optional[date] = Query(None, description="Optional start date"),
    end_date: Optional[date] = Query(None, description="Optional end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregate non-produce other farm income totals and category percentages."""
    return IncomeService.get_income_summary(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
    )


@income_router.post(
    "",
    response_model=IncomeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a new non-crop other farm income entry",
)
def create_income(
    payload: IncomeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record non-produce farm income (government subsidies, rentals, consulting, etc.)."""
    return IncomeService.create_income(db=db, user_id=current_user.id, payload=payload)


@income_router.get(
    "/{income_id}",
    response_model=IncomeResponse,
    summary="Get single other income record details",
)
def get_income(
    income_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch details of an authorized other farm income entry."""
    return IncomeService.get_income_by_id(
        db=db, income_id=income_id, user_id=current_user.id
    )


@income_router.put(
    "/{income_id}",
    response_model=IncomeResponse,
    summary="Update an existing other farm income record",
)
def update_income(
    income_id: UUID,
    payload: IncomeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Modify parameters of an existing other income entry."""
    return IncomeService.update_income(
        db=db, income_id=income_id, user_id=current_user.id, payload=payload
    )


@income_router.delete(
    "/{income_id}",
    response_model=IncomeDeleteResponse,
    summary="Delete an other farm income entry",
)
def delete_income(
    income_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove an other farm income record."""
    return IncomeService.delete_income(
        db=db, income_id=income_id, user_id=current_user.id
    )


# ==========================================
# Nested Convenience Routes
# ==========================================


@income_convenience_router.get(
    "/farms/{farm_id}/income",
    response_model=List[IncomeResponse],
    tags=["Farms", "Other Income"],
    summary="Get other income entries associated with a specific farm",
)
def get_farm_income(
    farm_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve other farm income entries linked to a specific farm estate."""
    return IncomeService.list_incomes(db=db, user_id=current_user.id, farm_id=farm_id)
