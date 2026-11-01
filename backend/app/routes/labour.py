"""Labour management API endpoints."""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.labour import (
    LabourCreate,
    LabourUpdate,
    LabourResponse,
    LabourDeleteResponse,
    LabourStats,
)
from app.schemas.attendance import AttendanceResponse, AttendanceCreate
from app.schemas.salary import SalaryResponse
from app.services.labour_service import LabourService
from app.services.attendance_service import AttendanceService
from app.services.salary_service import SalaryService

labour_router = APIRouter()


@labour_router.get(
    "",
    response_model=List[LabourResponse],
    summary="List workers for authenticated user with optional filtering",
)
def get_user_labour(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (active, inactive)"),
    farm_id: Optional[UUID] = Query(None, description="Filter by farm estate ID"),
    work_type: Optional[str] = Query(None, description="Filter by work trade"),
    search: Optional[str] = Query(None, description="Search keyword matching worker name, phone, trade, or farm"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all farm workers belonging to farms owned by the current authenticated user."""
    return LabourService.list_labour_for_user(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        status_filter=status_filter,
        work_type=work_type,
        search=search,
    )


@labour_router.get(
    "/stats",
    response_model=LabourStats,
    summary="Get summary workforce statistics",
)
def get_labour_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve total, active, and inactive worker counts for current user."""
    return LabourService.get_labour_stats_for_user(
        db=db,
        user_id=current_user.id,
    )


@labour_router.post(
    "",
    response_model=LabourResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new worker",
)
def create_labour(
    labour_in: LabourCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Register a new worker assigned to an owned farm estate.
    The farm_id must be provided in the request body and verified to belong to the authenticated user.
    """
    if not labour_in.farm_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="farm_id is required in request body when posting to /api/labour",
        )

    return LabourService.create_labour(
        db=db,
        farm_id=labour_in.farm_id,
        labour_in=labour_in,
        user_id=current_user.id,
    )


@labour_router.get(
    "/{labour_id}",
    response_model=LabourResponse,
    summary="Get worker profile by ID",
)
def get_labour_details(
    labour_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve worker profile details, verifying ownership via farm association."""
    return LabourService.get_labour_by_id(
        db=db,
        labour_id=labour_id,
        user_id=current_user.id,
    )


@labour_router.put(
    "/{labour_id}",
    response_model=LabourResponse,
    summary="Update worker profile details",
)
def update_labour(
    labour_id: UUID,
    labour_update: LabourUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update worker information, daily wage, or active status."""
    return LabourService.update_labour(
        db=db,
        labour_id=labour_id,
        labour_update=labour_update,
        user_id=current_user.id,
    )


@labour_router.delete(
    "/{labour_id}",
    response_model=LabourDeleteResponse,
    summary="Deactivate or permanently delete a worker",
)
def deactivate_or_delete_labour(
    labour_id: UUID,
    permanent: bool = Query(False, description="Set true for permanent purge; default is safe deactivation"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Deactivates a worker by default (Active -> Inactive) to preserve historical records.
    If permanent=true is explicitly requested, permanently deletes the database record.
    """
    return LabourService.deactivate_or_delete_labour(
        db=db,
        labour_id=labour_id,
        user_id=current_user.id,
        permanent=permanent,
    )


# Nested Attendance endpoints for convenience
@labour_router.get(
    "/{labour_id}/attendance",
    response_model=List[AttendanceResponse],
    summary="Get worker's attendance history",
)
def get_worker_attendance_history(
    labour_id: UUID,
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full attendance timeline for a specific worker, ensuring farm ownership."""
    from datetime import datetime as dt
    parsed_start = dt.strptime(start_date, "%Y-%m-%d").date() if start_date else None
    parsed_end = dt.strptime(end_date, "%Y-%m-%d").date() if end_date else None

    return AttendanceService.list_attendance(
        db=db,
        user_id=current_user.id,
        labour_id=labour_id,
        start_date=parsed_start,
        end_date=parsed_end,
    )


@labour_router.post(
    "/{labour_id}/attendance",
    response_model=AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record attendance for a worker",
)
def create_worker_attendance(
    labour_id: UUID,
    attendance_in: AttendanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record attendance for a worker specified in path parameter."""
    return AttendanceService.create_attendance(
        db=db,
        user_id=current_user.id,
        attendance_in=attendance_in,
        target_labour_id=labour_id,
    )


@labour_router.get(
    "/{labour_id}/salaries",
    response_model=List[SalaryResponse],
    summary="Get worker's salary history",
)
def get_worker_salary_history(
    labour_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full salary ledger history for a specific worker, ensuring farm ownership."""
    return SalaryService.list_salaries(
        db=db,
        user_id=current_user.id,
        labour_id=labour_id,
    )

