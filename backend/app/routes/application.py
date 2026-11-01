"""Agricultural Application API endpoints for fertilizer and pesticide tracking."""

from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    ApplicationSummaryResponse,
    ApplicationDeleteResponse,
)
from app.services.application_service import ApplicationService

application_router = APIRouter()


@application_router.get(
    "",
    response_model=List[ApplicationResponse],
    summary="List agricultural applications with multi-criteria filtering",
)
def get_applications(
    category: Optional[str] = Query(None, description="Filter category ('fertilizer' or 'pesticide')"),
    farm_id: Optional[UUID] = Query(None, description="Filter by farm estate UUID"),
    field_id: Optional[UUID] = Query(None, description="Filter by field plot UUID"),
    crop_id: Optional[UUID] = Query(None, description="Filter by crop cycle UUID"),
    start_date: Optional[date] = Query(None, description="Filter application date on or after"),
    end_date: Optional[date] = Query(None, description="Filter application date on or before"),
    product_type: Optional[str] = Query(None, description="Filter by product classification"),
    search: Optional[str] = Query(None, description="Search keyword matching product name, purpose, or field"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all fertilizer and pesticide applications for farms owned by the current authenticated user."""
    return ApplicationService.list_applications(
        db=db,
        user_id=current_user.id,
        category=category,
        farm_id=farm_id,
        field_id=field_id,
        crop_id=crop_id,
        start_date=start_date,
        end_date=end_date,
        product_type=product_type,
        search=search,
    )


@application_router.get(
    "/summary",
    response_model=ApplicationSummaryResponse,
    summary="Get aggregated application statistics and expenditure totals",
)
def get_applications_summary(
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID filter"),
    start_date: Optional[date] = Query(None, description="Optional start date filter"),
    end_date: Optional[date] = Query(None, description="Optional end date filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregate total counts, fertilizer costs, and pesticide costs across owned farms."""
    return ApplicationService.get_applications_summary(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
    )


@application_router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a new fertilizer or pesticide application",
)
def create_application(
    app_in: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log an agricultural application with automatic cost calculations and tenant validation."""
    return ApplicationService.create_application(
        db=db,
        user_id=current_user.id,
        app_in=app_in,
    )


@application_router.get(
    "/{application_id}",
    response_model=ApplicationResponse,
    summary="Get agricultural application details by ID",
)
def get_application_by_id(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve specific application details by UUID, verifying user ownership."""
    return ApplicationService.get_application_by_id(
        db=db,
        user_id=current_user.id,
        app_id=application_id,
    )


@application_router.put(
    "/{application_id}",
    response_model=ApplicationResponse,
    summary="Update an existing agricultural application",
)
def update_application(
    application_id: UUID,
    app_in: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit application parameters, dosages, or notes with recalculation."""
    return ApplicationService.update_application(
        db=db,
        user_id=current_user.id,
        app_id=application_id,
        app_in=app_in,
    )


@application_router.delete(
    "/{application_id}",
    response_model=ApplicationDeleteResponse,
    summary="Delete an agricultural application record",
)
def delete_application(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove application entry, verifying farm tenant ownership."""
    return ApplicationService.delete_application(
        db=db,
        user_id=current_user.id,
        app_id=application_id,
    )


# ---------------------------------------------------------------------------
# NESTED QUERY CONVENIENCE ENDPOINTS
# ---------------------------------------------------------------------------


@application_router.get(
    "/farm/{farm_id}",
    response_model=List[ApplicationResponse],
    summary="List applications for a specific farm",
)
def get_farm_applications(
    farm_id: UUID,
    category: Optional[str] = Query(None, description="Optional category filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List applications executed on a specific farm."""
    return ApplicationService.list_applications(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        category=category,
    )


@application_router.get(
    "/field/{field_id}",
    response_model=List[ApplicationResponse],
    summary="List applications for a specific field plot",
)
def get_field_applications(
    field_id: UUID,
    category: Optional[str] = Query(None, description="Optional category filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List applications executed on a specific field plot."""
    return ApplicationService.list_applications(
        db=db,
        user_id=current_user.id,
        field_id=field_id,
        category=category,
    )


@application_router.get(
    "/crop/{crop_id}",
    response_model=List[ApplicationResponse],
    summary="List applications for a specific crop cycle",
)
def get_crop_applications(
    crop_id: UUID,
    category: Optional[str] = Query(None, description="Optional category filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List applications targeted at a specific crop cycle."""
    return ApplicationService.list_applications(
        db=db,
        user_id=current_user.id,
        crop_id=crop_id,
        category=category,
    )
