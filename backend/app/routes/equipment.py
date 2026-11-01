"""Equipment and Machinery API endpoints for Phase 13: Equipment & Machinery Management."""

from datetime import date
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.equipment import (
    EquipmentCreate,
    EquipmentUpdate,
    EquipmentStatusUpdate,
    EquipmentResponse,
    EquipmentMaintenanceCreate,
    EquipmentMaintenanceUpdate,
    EquipmentMaintenanceResponse,
    EquipmentSummaryResponse,
    EquipmentDeleteResponse,
)
from app.services.equipment_service import EquipmentService

equipment_router = APIRouter()


@equipment_router.get(
    "",
    response_model=List[EquipmentResponse],
    summary="List all farm equipment with multi-criteria filtering",
)
def get_equipment(
    farm_id: Optional[UUID] = Query(None, description="Filter by farm estate UUID"),
    field_id: Optional[UUID] = Query(None, description="Filter by field plot UUID"),
    equipment_type: Optional[str] = Query(None, description="Filter by equipment type"),
    operational_status: Optional[str] = Query(None, description="Filter by operational status"),
    condition: Optional[str] = Query(None, description="Filter by condition"),
    service_status: Optional[str] = Query(
        None,
        description="Filter by service schedule ('overdue', 'upcoming', 'due_soon', 'missing_date', 'under_maintenance', 'retired')",
    ),
    search: Optional[str] = Query(None, description="Search by name, brand, model, serial, or tag"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve list of equipment owned by authenticated user."""
    return EquipmentService.list_equipment(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        field_id=field_id,
        equipment_type=equipment_type,
        operational_status=operational_status,
        condition=condition,
        service_status_filter=service_status,
        search=search,
    )


@equipment_router.get(
    "/summary",
    response_model=EquipmentSummaryResponse,
    summary="Get authoritative equipment dashboard summary statistics",
)
def get_equipment_summary(
    farm_id: Optional[UUID] = Query(None, description="Optional farm filter"),
    field_id: Optional[UUID] = Query(None, description="Optional field filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate aggregate equipment metrics, service alert counts, and total costs."""
    return EquipmentService.get_summary(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        field_id=field_id,
    )


@equipment_router.post(
    "",
    response_model=EquipmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new piece of equipment or machinery",
)
def create_equipment(
    payload: EquipmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register equipment with specifications, purchase details, and service dates."""
    return EquipmentService.create_equipment(
        db=db,
        payload=payload,
        user_id=current_user.id,
    )


@equipment_router.get(
    "/{equipment_id}",
    response_model=EquipmentResponse,
    summary="Get equipment details and maintenance history",
)
def get_equipment_by_id(
    equipment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch complete equipment profile including specifications and maintenance log."""
    return EquipmentService.get_equipment_by_id(
        db=db,
        equipment_id=equipment_id,
        user_id=current_user.id,
    )


@equipment_router.put(
    "/{equipment_id}",
    response_model=EquipmentResponse,
    summary="Update equipment specifications or schedules",
)
def update_equipment(
    equipment_id: UUID,
    payload: EquipmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update equipment attributes with ownership and relationship validation."""
    return EquipmentService.update_equipment(
        db=db,
        equipment_id=equipment_id,
        payload=payload,
        user_id=current_user.id,
    )


@equipment_router.patch(
    "/{equipment_id}/status",
    response_model=EquipmentResponse,
    summary="Update operational status and condition",
)
def update_equipment_status(
    equipment_id: UUID,
    payload: EquipmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Quickly transition operational status (e.g. available -> in_use -> under_maintenance -> retired)."""
    return EquipmentService.update_equipment_status(
        db=db,
        equipment_id=equipment_id,
        payload=payload,
        user_id=current_user.id,
    )


@equipment_router.delete(
    "/{equipment_id}",
    response_model=EquipmentDeleteResponse,
    summary="Safely delete equipment record",
)
def delete_equipment(
    equipment_id: UUID,
    force: bool = Query(False, description="Force delete even if maintenance history exists"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Safely delete equipment.
    Blocks deletion if maintenance history exists unless force=True to protect audit history.
    """
    return EquipmentService.delete_equipment(
        db=db,
        equipment_id=equipment_id,
        user_id=current_user.id,
        force=force,
    )


# =========================================================================
# Maintenance Endpoints
# =========================================================================

@equipment_router.get(
    "/{equipment_id}/maintenance",
    response_model=List[EquipmentMaintenanceResponse],
    summary="Get maintenance and repair history for an equipment item",
)
def list_maintenance(
    equipment_id: UUID,
    maintenance_type: Optional[str] = Query(None, description="Filter by maintenance type"),
    start_date: Optional[date] = Query(None, description="Filter on or after date"),
    end_date: Optional[date] = Query(None, description="Filter on or before date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List chronological maintenance logs for an equipment item."""
    return EquipmentService.list_maintenance_records(
        db=db,
        equipment_id=equipment_id,
        user_id=current_user.id,
        maintenance_type=maintenance_type,
        start_date=start_date,
        end_date=end_date,
    )


@equipment_router.post(
    "/{equipment_id}/maintenance",
    response_model=EquipmentMaintenanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a new maintenance or repair event",
)
def create_maintenance(
    equipment_id: UUID,
    payload: EquipmentMaintenanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record maintenance event and update equipment service schedules."""
    return EquipmentService.create_maintenance_record(
        db=db,
        equipment_id=equipment_id,
        payload=payload,
        user_id=current_user.id,
    )


@equipment_router.get(
    "/{equipment_id}/maintenance/{maintenance_id}",
    response_model=EquipmentMaintenanceResponse,
    summary="Get single maintenance record details",
)
def get_maintenance_by_id(
    equipment_id: UUID,
    maintenance_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch single maintenance record details."""
    return EquipmentService.get_maintenance_record_by_id(
        db=db,
        maintenance_id=maintenance_id,
        user_id=current_user.id,
    )


@equipment_router.put(
    "/{equipment_id}/maintenance/{maintenance_id}",
    response_model=EquipmentMaintenanceResponse,
    summary="Update an existing maintenance record",
)
def update_maintenance(
    equipment_id: UUID,
    maintenance_id: UUID,
    payload: EquipmentMaintenanceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update maintenance log details and synchronize equipment service dates."""
    return EquipmentService.update_maintenance_record(
        db=db,
        maintenance_id=maintenance_id,
        payload=payload,
        user_id=current_user.id,
    )


@equipment_router.delete(
    "/{equipment_id}/maintenance/{maintenance_id}",
    summary="Delete a maintenance record",
)
def delete_maintenance(
    equipment_id: UUID,
    maintenance_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete single maintenance record and recalculate equipment last service date."""
    return EquipmentService.delete_maintenance_record(
        db=db,
        maintenance_id=maintenance_id,
        user_id=current_user.id,
    )


# =========================================================================
# Nested Convenience Endpoints
# =========================================================================

convenience_router = APIRouter()


@convenience_router.get(
    "/farms/{farm_id}/equipment",
    response_model=List[EquipmentResponse],
    tags=["Equipment"],
    summary="Convenience route: List equipment for a specific farm",
)
def get_farm_equipment(
    farm_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve equipment stationed on a specific farm."""
    return EquipmentService.list_equipment(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
    )


@convenience_router.get(
    "/fields/{field_id}/equipment",
    response_model=List[EquipmentResponse],
    tags=["Equipment"],
    summary="Convenience route: List equipment for a specific field plot",
)
def get_field_equipment(
    field_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve equipment allocated to a specific field plot."""
    return EquipmentService.list_equipment(
        db=db,
        user_id=current_user.id,
        field_id=field_id,
    )
