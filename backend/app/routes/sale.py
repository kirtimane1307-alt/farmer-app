"""Produce Sales API endpoints for Phase 15: Sales, Income & Profit/Loss Management."""

from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.sale import (
    SaleCreate,
    SaleUpdate,
    SaleResponse,
    SaleSummaryResponse,
    SalePaymentCreate,
    SalePaymentResponse,
    SaleDeleteResponse,
)
from app.schemas.finance import FinancialSummaryResponse
from app.services.sale_service import SaleService
from app.services.finance_service import FinanceService

sale_router = APIRouter()
sale_convenience_router = APIRouter()


@sale_router.get(
    "",
    response_model=List[SaleResponse],
    summary="List produce sales with multi-attribute filtering",
)
def get_sales(
    farm_id: Optional[UUID] = Query(None, description="Filter by farm estate UUID"),
    field_id: Optional[UUID] = Query(None, description="Filter by field plot UUID"),
    crop_id: Optional[UUID] = Query(None, description="Filter by crop cycle UUID"),
    harvest_id: Optional[UUID] = Query(None, description="Filter by harvest UUID"),
    payment_status: Optional[str] = Query(
        None, description="Filter by payment status ('unpaid', 'partially_paid', 'paid')"
    ),
    start_date: Optional[date] = Query(None, description="Filter sales starting from date"),
    end_date: Optional[date] = Query(None, description="Filter sales ending on date"),
    search: Optional[str] = Query(
        None, description="Search across sale number, buyer name, produce name, or notes"
    ),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(100, ge=1, le=200, description="Pagination page limit"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve produce sales records belonging to the authenticated farm owner."""
    return SaleService.list_sales(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        field_id=field_id,
        crop_id=crop_id,
        harvest_id=harvest_id,
        payment_status=payment_status,
        start_date=start_date,
        end_date=end_date,
        search=search,
        skip=skip,
        limit=limit,
    )


@sale_router.get(
    "/summary",
    response_model=SaleSummaryResponse,
    summary="Get authoritative produce sales aggregate metrics and crop breakdown",
)
def get_sales_summary(
    farm_id: Optional[UUID] = Query(None, description="Optional farm estate filter"),
    crop_id: Optional[UUID] = Query(None, description="Optional crop filter"),
    payment_status: Optional[str] = Query(None, description="Optional payment status filter"),
    start_date: Optional[date] = Query(None, description="Optional start date"),
    end_date: Optional[date] = Query(None, description="Optional end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate aggregate produce sales metrics for the authorized user."""
    return SaleService.get_sales_summary(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        crop_id=crop_id,
        payment_status=payment_status,
        start_date=start_date,
        end_date=end_date,
    )


@sale_router.get(
    "/financial-summary",
    response_model=FinancialSummaryResponse,
    tags=["Financial Overview", "Sales"],
    summary="Financial summary alias under /sales prefix",
)
def get_sales_financial_summary(
    farm_id: Optional[UUID] = Query(None, description="Optional farm estate filter"),
    start_date: Optional[date] = Query(None, description="Optional start date"),
    end_date: Optional[date] = Query(None, description="Optional end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Alias for financial summary endpoint mounted under /sales/financial-summary."""
    return FinanceService.get_financial_summary(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
    )


@sale_router.post(
    "",
    response_model=SaleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a new produce sale transaction",
)
def create_sale(
    payload: SaleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record produce sale with authoritative backend total and discount calculations."""
    return SaleService.create_sale(db=db, user_id=current_user.id, payload=payload)


@sale_router.get(
    "/{sale_id}",
    response_model=SaleResponse,
    summary="Get detailed information for a single produce sale",
)
def get_sale(
    sale_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a single sale record including customer details and payment transactions."""
    return SaleService.get_sale_by_id(db=db, sale_id=sale_id, user_id=current_user.id)


@sale_router.put(
    "/{sale_id}",
    response_model=SaleResponse,
    summary="Update produce sale parameters and recalculate balances",
)
def update_sale(
    sale_id: UUID,
    payload: SaleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Modify sale quantity, pricing, customer details, or commercial notes."""
    return SaleService.update_sale(
        db=db, sale_id=sale_id, user_id=current_user.id, payload=payload
    )


@sale_router.delete(
    "/{sale_id}",
    response_model=SaleDeleteResponse,
    summary="Safely delete an unpaid produce sale record",
)
def delete_sale(
    sale_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an unpaid sale record while preserving financial audit records if payments exist."""
    return SaleService.delete_sale(db=db, sale_id=sale_id, user_id=current_user.id)


# ==========================================
# Payment Tracking Sub-Routes
# ==========================================


@sale_router.get(
    "/{sale_id}/payments",
    response_model=List[SalePaymentResponse],
    summary="List payment installments recorded for a sale",
)
def get_sale_payments(
    sale_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch complete payment disbursement history for an authorized sale."""
    return SaleService.list_sale_payments(
        db=db, sale_id=sale_id, user_id=current_user.id
    )


@sale_router.post(
    "/{sale_id}/payments",
    response_model=SalePaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record customer payment against an outstanding sale",
)
def create_sale_payment(
    sale_id: UUID,
    payload: SalePaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a payment installment, update outstanding balance and payment status."""
    return SaleService.create_sale_payment(
        db=db, sale_id=sale_id, user_id=current_user.id, payload=payload
    )


@sale_router.delete(
    "/{sale_id}/payments/{payment_id}",
    response_model=SaleDeleteResponse,
    summary="Delete a payment installment and restore sale balance",
)
def delete_sale_payment(
    sale_id: UUID,
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a recorded payment installment and adjust outstanding balance."""
    return SaleService.delete_sale_payment(
        db=db, sale_id=sale_id, payment_id=payment_id, user_id=current_user.id
    )


# ==========================================
# Nested Convenience Routes
# ==========================================


@sale_convenience_router.get(
    "/farms/{farm_id}/sales",
    response_model=List[SaleResponse],
    tags=["Farms", "Sales"],
    summary="Get all produce sales linked to a specific farm",
)
def get_farm_sales(
    farm_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve sales originating from specified farm."""
    return SaleService.list_sales(db=db, user_id=current_user.id, farm_id=farm_id)


@sale_convenience_router.get(
    "/crops/{crop_id}/sales",
    response_model=List[SaleResponse],
    tags=["Crops", "Sales"],
    summary="Get all produce sales linked to a specific crop cycle",
)
def get_crop_sales(
    crop_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve sales records associated with specified crop cycle."""
    return SaleService.list_sales(db=db, user_id=current_user.id, crop_id=crop_id)


@sale_convenience_router.get(
    "/harvests/{harvest_id}/sales",
    response_model=List[SaleResponse],
    tags=["Harvest", "Sales"],
    summary="Get all produce sales linked to a specific harvest yield record",
)
def get_harvest_sales(
    harvest_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve sales records directly linked to a harvest yield record."""
    return SaleService.list_sales(db=db, user_id=current_user.id, harvest_id=harvest_id)
