"""Field/Plot management API endpoints."""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.field import FieldUpdate, FieldResponse, FieldDeleteResponse
from app.schemas.crop import CropCreate, CropResponse
from app.schemas.expense import ExpenseResponse
from app.services.field_service import FieldService
from app.services.crop_service import CropService
from app.services.expense_service import ExpenseService

fields_router = APIRouter()


@fields_router.get(
    "",
    response_model=List[FieldResponse],
    summary="List all fields across user farms",
)
def get_all_user_fields(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all fields across all farms owned by the current authenticated user."""
    return FieldService.list_all_fields_for_user(db=db, user_id=current_user.id)


@fields_router.get(
    "/{field_id}",
    response_model=FieldResponse,
    summary="Get field details by ID",
)
def get_field_details(
    field_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve details for a specific field, verifying farm ownership."""
    return FieldService.get_field_by_id(
        db=db, field_id=field_id, user_id=current_user.id
    )


@fields_router.put(
    "/{field_id}",
    response_model=FieldResponse,
    summary="Update field details",
)
def update_field(
    field_id: UUID,
    field_update: FieldUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update properties of an existing field owned by the authenticated user."""
    return FieldService.update_field(
        db=db, field_id=field_id, field_update=field_update, user_id=current_user.id
    )


@fields_router.delete(
    "/{field_id}",
    response_model=FieldDeleteResponse,
    summary="Delete a field plot",
)
def delete_field(
    field_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a field plot, ensuring caller is the parent farm owner."""
    return FieldService.delete_field(
        db=db, field_id=field_id, user_id=current_user.id
    )


# Nested Crop endpoints for field context
@fields_router.get(
    "/{field_id}/crops",
    response_model=List[CropResponse],
    summary="List crops under a specific field plot",
)
def get_field_crops(
    field_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all crops recorded under a specific field, ensuring field ownership."""
    return CropService.list_crops_for_field(
        db=db, field_id=field_id, user_id=current_user.id
    )


@fields_router.post(
    "/{field_id}/crops",
    response_model=CropResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a crop under a specific field plot",
)
def create_crop_on_field(
    field_id: UUID,
    crop_in: CropCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a new crop assigned to this field plot, verifying field ownership."""
    return CropService.create_crop(
        db=db,
        crop_in=crop_in,
        user_id=current_user.id,
        explicit_field_id=field_id,
    )


@fields_router.get(
    "/{field_id}/expenses",
    response_model=List[ExpenseResponse],
    summary="Get all expenses for a specific field plot",
)
def get_field_expenses(
    field_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all expenses allocated to a specific field plot."""
    # First verify field ownership through field_service
    FieldService.get_field_by_id(db=db, field_id=field_id, user_id=current_user.id)
    return ExpenseService.list_expenses(
        db=db,
        user_id=current_user.id,
        field_id=field_id,
    )
