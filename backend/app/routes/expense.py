"""Farm Expense API endpoints for Phase 12: Expense Management."""

from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpensePaymentCreate,
    ExpensePaymentResponse,
    ExpenseSummaryResponse,
    ExpenseDeleteResponse,
)
from app.services.expense_service import ExpenseService

expense_router = APIRouter()


@expense_router.get(
    "",
    response_model=List[ExpenseResponse],
    summary="List all farm expenses with multi-criteria filtering",
)
def get_expenses(
    farm_id: Optional[UUID] = Query(None, description="Filter by farm estate UUID"),
    field_id: Optional[UUID] = Query(None, description="Filter by field plot UUID"),
    crop_id: Optional[UUID] = Query(None, description="Filter by crop cycle UUID"),
    category: Optional[str] = Query(None, description="Filter by expense category"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status ('unpaid', 'partially_paid', 'paid')"),
    vendor_name: Optional[str] = Query(None, description="Filter by supplier / vendor name"),
    start_date: Optional[date] = Query(None, description="Filter expenses on or after date"),
    end_date: Optional[date] = Query(None, description="Filter expenses on or before date"),
    search: Optional[str] = Query(None, description="Search term matching title, description, vendor, or invoice"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve list of farm expenses owned by authenticated user."""
    return ExpenseService.list_expenses(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        field_id=field_id,
        crop_id=crop_id,
        category=category,
        payment_status=payment_status,
        vendor_name=vendor_name,
        start_date=start_date,
        end_date=end_date,
        search=search,
    )


@expense_router.get(
    "/summary",
    response_model=ExpenseSummaryResponse,
    summary="Get authoritative expense summary statistics and category breakdown",
)
def get_expense_summary(
    farm_id: Optional[UUID] = Query(None, description="Optional farm filter"),
    field_id: Optional[UUID] = Query(None, description="Optional field filter"),
    crop_id: Optional[UUID] = Query(None, description="Optional crop filter"),
    category: Optional[str] = Query(None, description="Optional category filter"),
    payment_status: Optional[str] = Query(None, description="Optional payment status filter"),
    start_date: Optional[date] = Query(None, description="Optional start date"),
    end_date: Optional[date] = Query(None, description="Optional end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate total expenses, paid, unpaid, partially paid amounts, and category breakdown."""
    return ExpenseService.get_summary(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        field_id=field_id,
        crop_id=crop_id,
        category=category,
        payment_status=payment_status,
        start_date=start_date,
        end_date=end_date,
    )


@expense_router.get(
    "/export",
    summary="Export filtered farm expenses to CSV format",
)
def export_expenses(
    farm_id: Optional[UUID] = Query(None, description="Optional farm filter"),
    field_id: Optional[UUID] = Query(None, description="Optional field filter"),
    crop_id: Optional[UUID] = Query(None, description="Optional crop filter"),
    category: Optional[str] = Query(None, description="Optional category filter"),
    payment_status: Optional[str] = Query(None, description="Optional payment status filter"),
    start_date: Optional[date] = Query(None, description="Optional start date"),
    end_date: Optional[date] = Query(None, description="Optional end date"),
    search: Optional[str] = Query(None, description="Optional search keyword"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate and download CSV export containing filtered expense records."""
    csv_data = ExpenseService.export_csv(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        field_id=field_id,
        crop_id=crop_id,
        category=category,
        payment_status=payment_status,
        start_date=start_date,
        end_date=end_date,
        search=search,
    )
    filename = f"farm_expenses_{date.today().isoformat()}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@expense_router.post(
    "",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a new farm expense",
)
def create_expense(
    expense_in: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a farm expense with relational validation and automatic ledger tracking."""
    return ExpenseService.create_expense(
        db=db,
        user_id=current_user.id,
        expense_in=expense_in,
    )


@expense_router.get(
    "/{expense_id}",
    response_model=ExpenseResponse,
    summary="Get single expense details by ID",
)
def get_expense(
    expense_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full details of an expense record including disbursement ledger."""
    return ExpenseService.get_expense(
        db=db,
        expense_id=expense_id,
        user_id=current_user.id,
    )


@expense_router.put(
    "/{expense_id}",
    response_model=ExpenseResponse,
    summary="Update an existing expense",
)
def update_expense(
    expense_id: UUID,
    update_in: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Modify an existing expense record with financial consistency checks."""
    return ExpenseService.update_expense(
        db=db,
        expense_id=expense_id,
        user_id=current_user.id,
        update_in=update_in,
    )


@expense_router.delete(
    "/{expense_id}",
    response_model=ExpenseDeleteResponse,
    summary="Delete an unpaid expense record",
)
def delete_expense(
    expense_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Safely delete an unpaid expense. Rejects deletion if payments have been recorded."""
    return ExpenseService.delete_expense(
        db=db,
        expense_id=expense_id,
        user_id=current_user.id,
    )


@expense_router.get(
    "/{expense_id}/payments",
    response_model=List[ExpensePaymentResponse],
    summary="List payment disbursements for an expense",
)
def list_expense_payments(
    expense_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve disbursement audit trail for a specific expense."""
    return ExpenseService.list_payments(
        db=db,
        expense_id=expense_id,
        user_id=current_user.id,
    )


@expense_router.post(
    "/{expense_id}/payments",
    response_model=ExpensePaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a payment disbursement against an expense balance",
)
def record_expense_payment(
    expense_id: UUID,
    payment_in: ExpensePaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record an installment or full payment against the outstanding balance."""
    return ExpenseService.record_payment(
        db=db,
        expense_id=expense_id,
        user_id=current_user.id,
        payment_in=payment_in,
    )


# Nested convenience endpoints
@expense_router.get(
    "/farm/{farm_id}",
    response_model=List[ExpenseResponse],
    summary="Get all expenses for a specific farm estate",
)
def get_farm_expenses(
    farm_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all expenses associated with a specific farm."""
    return ExpenseService.list_expenses(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
    )


@expense_router.get(
    "/field/{field_id}",
    response_model=List[ExpenseResponse],
    summary="Get all expenses for a specific field plot",
)
def get_field_expenses(
    field_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all expenses associated with a specific field plot."""
    return ExpenseService.list_expenses(
        db=db,
        user_id=current_user.id,
        field_id=field_id,
    )


@expense_router.get(
    "/crop/{crop_id}",
    response_model=List[ExpenseResponse],
    summary="Get all expenses for a specific crop cycle",
)
def get_crop_expenses(
    crop_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all expenses associated with a specific crop cycle."""
    return ExpenseService.list_expenses(
        db=db,
        user_id=current_user.id,
        crop_id=crop_id,
    )
