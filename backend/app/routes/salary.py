"""Salary management and payment API endpoints."""

from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.salary import (
    SalaryPreviewRequest,
    SalaryPreviewResponse,
    SalaryCreate,
    SalaryUpdate,
    SalaryResponse,
    SalarySummaryResponse,
    SalaryDeleteResponse,
    PaymentCreate,
    PaymentResponse,
)
from app.services.salary_service import SalaryService

salary_router = APIRouter()


@salary_router.get(
    "",
    response_model=List[SalaryResponse],
    summary="List salary records with multi-criteria filtering",
)
def get_salary_records(
    farm_id: Optional[UUID] = Query(None, description="Filter by farm estate ID"),
    labour_id: Optional[UUID] = Query(None, description="Filter by specific worker ID"),
    status_filter: Optional[str] = Query(
        None, alias="status", description="Filter by status (draft, generated, partially_paid, paid)"
    ),
    start_date: Optional[date] = Query(None, description="Filter period start on or after this date"),
    end_date: Optional[date] = Query(None, description="Filter period end on or before this date"),
    search: Optional[str] = Query(None, description="Search worker name, work trade, or farm name"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve salary ledger records for farms owned by authenticated user."""
    return SalaryService.list_salaries(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        labour_id=labour_id,
        status_filter=status_filter,
        start_date=start_date,
        end_date=end_date,
        search=search,
    )


@salary_router.get(
    "/summary",
    response_model=SalarySummaryResponse,
    summary="Get aggregated salary & disbursement statistics",
)
def get_salary_summary(
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID filter"),
    start_date: Optional[date] = Query(None, description="Period start date filter"),
    end_date: Optional[date] = Query(None, description="Period end date filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate aggregate salary totals, disbursements, and balances across owned farms."""
    return SalaryService.get_salary_summary(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
    )


@salary_router.post(
    "/preview",
    response_model=SalaryPreviewResponse,
    summary="Generate authoritative salary calculation preview",
)
def preview_salary_calculation(
    preview_in: SalaryPreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate authoritative attendance breakdown and payable wages before generating record."""
    return SalaryService.preview_salary(
        db=db,
        user_id=current_user.id,
        preview_in=preview_in,
    )


@salary_router.post(
    "",
    response_model=SalaryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate and persist a permanent salary record",
)
def create_salary_record(
    salary_in: SalaryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate, freeze wage snapshot, and persist salary ledger record."""
    return SalaryService.create_salary(
        db=db,
        user_id=current_user.id,
        salary_in=salary_in,
    )


@salary_router.get(
    "/labour/{labour_id}",
    response_model=List[SalaryResponse],
    summary="Get salary history for a specific worker",
)
def get_labour_salary_history(
    labour_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve salary history for a worker belonging to the user's farms."""
    return SalaryService.list_salaries(
        db=db,
        user_id=current_user.id,
        labour_id=labour_id,
    )


@salary_router.get(
    "/{salary_id}",
    response_model=SalaryResponse,
    summary="Get salary record details by ID",
)
def get_salary_by_id(
    salary_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch complete salary ledger item and disbursement breakdown by UUID."""
    return SalaryService.get_salary_by_id(
        db=db,
        user_id=current_user.id,
        salary_id=salary_id,
    )


@salary_router.put(
    "/{salary_id}",
    response_model=SalaryResponse,
    summary="Update salary adjustments or notes",
)
def update_salary_record(
    salary_id: UUID,
    update_in: SalaryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update overtime pay, additional earnings, deductions, or remarks on existing salary."""
    return SalaryService.update_salary(
        db=db,
        user_id=current_user.id,
        salary_id=salary_id,
        update_in=update_in,
    )


@salary_router.delete(
    "/{salary_id}",
    response_model=SalaryDeleteResponse,
    summary="Delete unpaid salary record",
)
def delete_salary_record(
    salary_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a salary record (only permitted if zero payments have been recorded)."""
    return SalaryService.delete_salary(
        db=db,
        user_id=current_user.id,
        salary_id=salary_id,
    )


# ---------------------------------------------------------------------------
# PAYMENT LEDGER ENDPOINTS
# ---------------------------------------------------------------------------


@salary_router.get(
    "/{salary_id}/payments",
    response_model=List[PaymentResponse],
    summary="List disbursement history for a salary record",
)
def list_salary_payments(
    salary_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all recorded payment disbursements for the specified salary record."""
    return SalaryService.list_payments(
        db=db,
        user_id=current_user.id,
        salary_id=salary_id,
    )


@salary_router.post(
    "/{salary_id}/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a wage disbursement against a salary record",
)
def record_salary_payment(
    salary_id: UUID,
    payment_in: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Atomically record payment, validate non-overpayment, and update salary status."""
    return SalaryService.record_payment(
        db=db,
        user_id=current_user.id,
        salary_id=salary_id,
        payment_in=payment_in,
    )


@salary_router.get(
    "/{salary_id}/payments/{payment_id}",
    response_model=PaymentResponse,
    summary="Get individual payment disbursement record",
)
def get_payment_record(
    salary_id: UUID,
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch specific payment disbursement detail by ID."""
    return SalaryService.get_payment_by_id(
        db=db,
        user_id=current_user.id,
        salary_id=salary_id,
        payment_id=payment_id,
    )
