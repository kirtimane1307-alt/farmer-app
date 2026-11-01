"""Harvest API endpoints for Phase 14: Harvest Management."""

from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.harvest import (
    HarvestCreate,
    HarvestUpdate,
    HarvestResponse,
    HarvestSummaryResponse,
    HarvestDeleteResponse,
)
from app.services.harvest_service import HarvestService

harvest_router = APIRouter()


@harvest_router.get(
    "",
    response_model=List[HarvestResponse],
    summary="List all crop harvests with multi-attribute filtering",
)
def get_harvests(
    farm_id: Optional[UUID] = Query(None, description="Filter by farm estate UUID"),
    field_id: Optional[UUID] = Query(None, description="Filter by field plot UUID"),
    crop_id: Optional[UUID] = Query(None, description="Filter by crop cycle UUID"),
    start_date: Optional[date] = Query(None, description="Filter by harvest date starting from"),
    end_date: Optional[date] = Query(None, description="Filter by harvest date ending on"),
    unit: Optional[str] = Query(None, description="Filter by measurement unit (kg, quintals, tonnes, bags, etc.)"),
    quality_grade: Optional[str] = Query(None, description="Filter by quality grade"),
    search: Optional[str] = Query(None, description="Search across crop name, variety, storage location, or batch"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(50, ge=1, le=200, description="Pagination page limit"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve harvest records belonging to the authenticated farm owner."""
    harvests, _ = HarvestService.get_harvests(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        field_id=field_id,
        crop_id=crop_id,
        start_date=start_date,
        end_date=end_date,
        unit=unit,
        quality_grade=quality_grade,
        search=search,
        skip=skip,
        limit=limit,
    )
    return harvests


@harvest_router.post(
    "",
    response_model=HarvestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a new crop harvest",
)
def create_harvest(
    harvest_in: HarvestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new harvest log with ownership and farm/field/crop hierarchy validation."""
    return HarvestService.create_harvest(
        db=db,
        user_id=current_user.id,
        harvest_in=harvest_in,
    )


@harvest_router.get(
    "/summary",
    response_model=HarvestSummaryResponse,
    summary="Retrieve aggregated harvest metrics and yield totals",
)
def get_harvest_summary(
    farm_id: Optional[UUID] = Query(None, description="Filter summary by farm estate"),
    field_id: Optional[UUID] = Query(None, description="Filter summary by field plot"),
    crop_id: Optional[UUID] = Query(None, description="Filter summary by crop cycle"),
    start_date: Optional[date] = Query(None, description="Summary start date"),
    end_date: Optional[date] = Query(None, description="Summary end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate authoritative harvest counts, metric weights, and discrete unit distributions."""
    return HarvestService.get_harvest_summary(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        field_id=field_id,
        crop_id=crop_id,
        start_date=start_date,
        end_date=end_date,
    )


@harvest_router.get(
    "/{harvest_id}",
    response_model=HarvestResponse,
    summary="Get single harvest record details",
)
def get_harvest_details(
    harvest_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch harvest record by ID with authorization verification."""
    return HarvestService.get_harvest_by_id(
        db=db,
        user_id=current_user.id,
        harvest_id=harvest_id,
    )


@harvest_router.put(
    "/{harvest_id}",
    response_model=HarvestResponse,
    summary="Update an existing harvest record",
)
def update_harvest(
    harvest_id: UUID,
    harvest_in: HarvestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update harvest parameters and revalidate entity relationships."""
    return HarvestService.update_harvest(
        db=db,
        user_id=current_user.id,
        harvest_id=harvest_id,
        harvest_in=harvest_in,
    )


@harvest_router.delete(
    "/{harvest_id}",
    response_model=HarvestDeleteResponse,
    summary="Delete a harvest record",
)
def delete_harvest(
    harvest_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Safely delete harvest record without cascading to crops or farms."""
    return HarvestService.delete_harvest(
        db=db,
        user_id=current_user.id,
        harvest_id=harvest_id,
    )


# =========================================================================
# Nested Convenience Routes
# =========================================================================

harvest_convenience_router = APIRouter()


@harvest_convenience_router.get(
    "/farms/{farm_id}/harvests",
    response_model=List[HarvestResponse],
    tags=["Harvest"],
    summary="Convenience route: List harvests for a specific farm",
)
def get_farm_harvests(
    farm_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve harvests recorded across fields on a specific farm."""
    harvests, _ = HarvestService.get_harvests(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
    )
    return harvests


@harvest_convenience_router.get(
    "/fields/{field_id}/harvests",
    response_model=List[HarvestResponse],
    tags=["Harvest"],
    summary="Convenience route: List harvests for a specific field plot",
)
def get_field_harvests(
    field_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve harvests gathered from a specific field plot."""
    harvests, _ = HarvestService.get_harvests(
        db=db,
        user_id=current_user.id,
        field_id=field_id,
    )
    return harvests


@harvest_convenience_router.get(
    "/crops/{crop_id}/harvests",
    response_model=List[HarvestResponse],
    tags=["Harvest"],
    summary="Convenience route: List harvests for a specific crop cycle",
)
def get_crop_harvests(
    crop_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve harvest yield logs recorded for a specific crop cycle."""
    harvests, _ = HarvestService.get_harvests(
        db=db,
        user_id=current_user.id,
        crop_id=crop_id,
    )
    return harvests
