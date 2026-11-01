"""Attendance management API endpoints."""

from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceUpdate,
    AttendanceResponse,
    AttendanceDeleteResponse,
    BulkAttendanceCreate,
    BulkAttendanceResponse,
    AttendanceDailySummary,
)
from app.services.attendance_service import AttendanceService

attendance_router = APIRouter()


@attendance_router.get(
    "",
    response_model=List[AttendanceResponse],
    summary="List attendance logs with optional multi-criteria filtering",
)
def get_attendance_records(
    date_filter: Optional[date] = Query(None, alias="date", description="Filter by exact attendance date"),
    attendance_date: Optional[date] = Query(None, description="Alias for date"),
    start_date: Optional[date] = Query(None, description="Filter logs on or after this date"),
    end_date: Optional[date] = Query(None, description="Filter logs on or before this date"),
    farm_id: Optional[UUID] = Query(None, description="Filter by farm estate ID"),
    labour_id: Optional[UUID] = Query(None, description="Filter by specific worker ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (present, absent, half_day, leave)"),
    search: Optional[str] = Query(None, description="Search worker name, work trade, or farm name"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve attendance logs for farms owned by the current authenticated user."""
    effective_date = attendance_date or date_filter
    return AttendanceService.list_attendance(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        labour_id=labour_id,
        attendance_date=effective_date,
        start_date=start_date,
        end_date=end_date,
        status_filter=status_filter,
        search=search,
    )


@attendance_router.get(
    "/summary",
    response_model=AttendanceDailySummary,
    summary="Get daily attendance summary statistics and hours logged",
)
def get_attendance_summary(
    date_filter: Optional[date] = Query(None, alias="date", description="Target date (defaults to current date)"),
    attendance_date: Optional[date] = Query(None, description="Target date"),
    farm_id: Optional[UUID] = Query(None, description="Optional farm filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve aggregate attendance breakdown (present, absent, half-day, leave, unmarked) and working hours."""
    target_date = attendance_date or date_filter or date.today()
    return AttendanceService.get_daily_summary(
        db=db,
        user_id=current_user.id,
        target_date=target_date,
        farm_id=farm_id,
    )


@attendance_router.get(
    "/date/{attendance_date}",
    response_model=List[AttendanceResponse],
    summary="Get attendance records for a specific date",
)
def get_attendance_for_date(
    attendance_date: date,
    farm_id: Optional[UUID] = Query(None, description="Optional farm estate filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all worker attendance records for a specific calendar date."""
    return AttendanceService.list_attendance(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        attendance_date=attendance_date,
    )


@attendance_router.post(
    "",
    response_model=AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record attendance for a worker",
)
def create_attendance(
    attendance_in: AttendanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new attendance record for an authorized worker on a given date."""
    return AttendanceService.create_attendance(
        db=db,
        user_id=current_user.id,
        attendance_in=attendance_in,
    )


@attendance_router.post(
    "/bulk",
    response_model=BulkAttendanceResponse,
    summary="Submit bulk attendance sheet for multiple workers",
)
def submit_bulk_attendance(
    bulk_in: BulkAttendanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save attendance entries for multiple workers on a date simultaneously."""
    return AttendanceService.bulk_create_or_update(
        db=db,
        user_id=current_user.id,
        bulk_in=bulk_in,
    )


@attendance_router.get(
    "/{attendance_id}",
    response_model=AttendanceResponse,
    summary="Get attendance record by ID",
)
def get_attendance_by_id(
    attendance_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve single attendance log details ensuring ownership."""
    return AttendanceService.get_attendance_by_id(
        db=db,
        attendance_id=attendance_id,
        user_id=current_user.id,
    )


@attendance_router.put(
    "/{attendance_id}",
    response_model=AttendanceResponse,
    summary="Update an existing attendance record",
)
def update_attendance(
    attendance_id: UUID,
    attendance_update: AttendanceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update check-in/out times, status, or overtime for an attendance log."""
    return AttendanceService.update_attendance(
        db=db,
        attendance_id=attendance_id,
        user_id=current_user.id,
        attendance_update=attendance_update,
    )


@attendance_router.delete(
    "/{attendance_id}",
    response_model=AttendanceDeleteResponse,
    summary="Delete an attendance record",
)
def delete_attendance(
    attendance_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete an attendance log entry."""
    return AttendanceService.delete_attendance(
        db=db,
        attendance_id=attendance_id,
        user_id=current_user.id,
    )
