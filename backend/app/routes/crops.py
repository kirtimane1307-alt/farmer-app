"""Crop management API endpoints."""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.crop import CropCreate, CropUpdate, CropResponse, CropDeleteResponse
from app.schemas.expense import ExpenseResponse
from app.services.crop_service import CropService
from app.services.expense_service import ExpenseService

crops_router = APIRouter()


@crops_router.get(
    "",
    response_model=List[CropResponse],
    summary="List crops with optional filtering",
)
def get_user_crops(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by lifecycle status (planned, growing, ready_to_harvest, harvested, failed)"),
    field_id: Optional[UUID] = Query(None, description="Filter by field plot ID"),
    farm_id: Optional[UUID] = Query(None, description="Filter by farm estate ID"),
    search: Optional[str] = Query(None, description="Keyword search in crop name, variety, season, or field"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all crops owned by current user with optional filtering by status, field, farm, or search term."""
    return CropService.list_crops_for_user(
        db=db,
        user_id=current_user.id,
        status_filter=status_filter,
        field_id=field_id,
        farm_id=farm_id,
        search=search,
    )


@crops_router.post(
    "",
    response_model=CropResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new crop cycle",
)
def create_crop(
    crop_in: CropCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Register a new crop cycle assigned to an owned field plot.
    Verifies that the caller owns the parent farm of the specified field.
    """
    return CropService.create_crop(
        db=db, crop_in=crop_in, user_id=current_user.id
    )


@crops_router.get(
    "/{crop_id}",
    response_model=CropResponse,
    summary="Get crop details by ID",
)
def get_crop_details(
    crop_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full crop cycle details, verifying user ownership through Field -> Farm -> User."""
    return CropService.get_crop_by_id(
        db=db, crop_id=crop_id, user_id=current_user.id
    )


@crops_router.put(
    "/{crop_id}",
    response_model=CropResponse,
    summary="Update crop details and status",
)
def update_crop(
    crop_id: UUID,
    crop_update: CropUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update crop lifecycle stage, expected harvest dates, seed quantities, or notes."""
    return CropService.update_crop(
        db=db, crop_id=crop_id, crop_update=crop_update, user_id=current_user.id
    )


@crops_router.delete(
    "/{crop_id}",
    response_model=CropDeleteResponse,
    summary="Delete a crop record",
)
def delete_crop(
    crop_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a crop cycle record, verifying caller ownership."""
    return CropService.delete_crop(
        db=db, crop_id=crop_id, user_id=current_user.id
    )


@crops_router.get(
    "/{crop_id}/expenses",
    response_model=List[ExpenseResponse],
    summary="Get all expenses for a specific crop cycle",
)
def get_crop_expenses(
    crop_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all expenses allocated to a specific crop cycle."""
    # First verify crop ownership through crop_service
    CropService.get_crop_by_id(db=db, crop_id=crop_id, user_id=current_user.id)
    return ExpenseService.list_expenses(
        db=db,
        user_id=current_user.id,
        crop_id=crop_id,
    )
