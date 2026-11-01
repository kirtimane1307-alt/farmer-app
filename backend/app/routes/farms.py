"""Farm management API endpoints."""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.farm import FarmCreate, FarmUpdate, FarmResponse, FarmDeleteResponse
from app.schemas.field import FieldCreate, FieldResponse
from app.schemas.labour import LabourCreate, LabourResponse
from app.schemas.expense import ExpenseResponse
from app.services.farm_service import FarmService
from app.services.field_service import FieldService
from app.services.labour_service import LabourService
from app.services.expense_service import ExpenseService

farms_router = APIRouter()


@farms_router.get(
    "",
    response_model=List[FarmResponse],
    summary="List all farms for authenticated user",
)
def get_user_farms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all farm landholdings owned by the current authenticated user."""
    return FarmService.list_farms_for_user(db=db, user_id=current_user.id)


@farms_router.post(
    "",
    response_model=FarmResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new farm",
)
def create_farm(
    farm_in: FarmCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Register a new farm landholding owned exclusively by the authenticated user.
    The user_id is automatically assigned from the validated session.
    """
    return FarmService.create_farm(db=db, farm_in=farm_in, user_id=current_user.id)


@farms_router.get(
    "/{farm_id}",
    response_model=FarmResponse,
    summary="Get farm details by ID",
)
def get_farm_details(
    farm_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve specific farm details ensuring the caller is the registered owner."""
    return FarmService.get_farm_by_id(db=db, farm_id=farm_id, user_id=current_user.id)


@farms_router.put(
    "/{farm_id}",
    response_model=FarmResponse,
    summary="Update farm details",
)
def update_farm(
    farm_id: UUID,
    farm_update: FarmUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update properties of an existing farm owned by the authenticated user."""
    return FarmService.update_farm(
        db=db, farm_id=farm_id, farm_update=farm_update, user_id=current_user.id
    )


@farms_router.delete(
    "/{farm_id}",
    response_model=FarmDeleteResponse,
    summary="Delete a farm and its fields",
)
def delete_farm(
    farm_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a farm owned by the user.
    Associated fields are safely removed via database cascade.
    """
    return FarmService.delete_farm(db=db, farm_id=farm_id, user_id=current_user.id)


# Nested field routes for convenience and REST standards
@farms_router.get(
    "/{farm_id}/fields",
    response_model=List[FieldResponse],
    summary="Get all fields belonging to a farm",
)
def get_farm_fields(
    farm_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all fields under a specific farm, ensuring farm ownership."""
    return FieldService.list_fields_for_farm(
        db=db, farm_id=farm_id, user_id=current_user.id
    )


@farms_router.post(
    "/{farm_id}/fields",
    response_model=FieldResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new field on a farm",
)
def create_field_on_farm(
    farm_id: UUID,
    field_in: FieldCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new field/plot within a farm owned by the authenticated user.
    """
    return FieldService.create_field(
        db=db, farm_id=farm_id, field_in=field_in, user_id=current_user.id
    )


# Nested labour routes for convenience and REST standards
@farms_router.get(
    "/{farm_id}/labour",
    response_model=List[LabourResponse],
    summary="Get all workers belonging to a farm",
)
def get_farm_labour(
    farm_id: UUID,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all workers registered under a specific farm, ensuring farm ownership."""
    return LabourService.list_labour_for_user(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        status_filter=status,
    )


@farms_router.post(
    "/{farm_id}/labour",
    response_model=LabourResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new worker on a farm",
)
def create_labour_on_farm(
    farm_id: UUID,
    labour_in: LabourCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a new worker under a farm owned by the authenticated user."""
    return LabourService.create_labour(
        db=db,
        farm_id=farm_id,
        labour_in=labour_in,
        user_id=current_user.id,
    )


@farms_router.get(
    "/{farm_id}/expenses",
    response_model=List[ExpenseResponse],
    summary="Get all expenses belonging to a specific farm",
)
def get_farm_expenses(
    farm_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all expenses allocated to a specific farm, ensuring farm ownership."""
    return ExpenseService.list_expenses(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
    )

