"""FastAPI router endpoints for Farm Calendar & Activity Management (Phase 16)."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.calendar import (
    CalendarEventCreate,
    CalendarEventUpdate,
    CalendarEventStatusUpdate,
    CalendarEventResponse,
    CalendarSummaryResponse,
    CalendarDeleteResponse,
)
from app.schemas.common import SuccessResponse
from app.services.calendar_service import CalendarService

calendar_router = APIRouter(tags=["Farm Calendar"])
calendar_convenience_router = APIRouter(tags=["Farm Calendar"])


# -----------------------------------------------------------------------------
# Main Calendar Endpoints
# -----------------------------------------------------------------------------

@calendar_router.get(
    "/events",
    response_model=SuccessResponse[List[CalendarEventResponse]],
    summary="List farm calendar activities within an optional date range",
)
def list_calendar_events(
    start_date: Optional[datetime] = Query(None, description="Start date/time for range overlap (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date/time for range overlap (ISO format)"),
    farm_id: Optional[UUID] = Query(None, description="Filter by farm estate"),
    field_id: Optional[UUID] = Query(None, description="Filter by field sector"),
    crop_id: Optional[UUID] = Query(None, description="Filter by crop cycle"),
    activity_type: Optional[str] = Query(None, description="Filter by activity category"),
    status: Optional[str] = Query(None, description="Filter by status (planned, in_progress, completed, cancelled)"),
    priority: Optional[str] = Query(None, description="Filter by priority (low, medium, high)"),
    assigned_labour_id: Optional[UUID] = Query(None, description="Filter by assigned worker"),
    search: Optional[str] = Query(None, description="Search keyword in title, description, or notes"),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve schedule activities with date overlap window and comprehensive filters."""
    events = CalendarService.get_events(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        farm_id=farm_id,
        field_id=field_id,
        crop_id=crop_id,
        activity_type=activity_type,
        status_filter=status,
        priority=priority,
        assigned_labour_id=assigned_labour_id,
        search=search,
        skip=skip,
        limit=limit,
    )
    return SuccessResponse(
        message="Calendar events retrieved successfully",
        data=events,
    )


@calendar_router.post(
    "/events",
    response_model=SuccessResponse[CalendarEventResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a new farm calendar activity",
)
def create_calendar_event(
    payload: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new activity with automatic validation of related farm, field, and worker."""
    event = CalendarService.create_event(
        db=db,
        user_id=current_user.id,
        payload=payload,
    )
    return SuccessResponse(
        message="Calendar activity scheduled successfully",
        data=event,
    )


@calendar_router.get(
    "/summary",
    response_model=SuccessResponse[CalendarSummaryResponse],
    summary="Get aggregated statistics and KPIs for calendar events",
)
def get_calendar_summary(
    start_date: Optional[datetime] = Query(None, description="Start date/time for range (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date/time for range (ISO format)"),
    farm_id: Optional[UUID] = Query(None, description="Optional farm scope"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve event counts by status, priority, overdue tasks, and activity breakdown."""
    summary_data = CalendarService.get_calendar_summary(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        farm_id=farm_id,
    )
    return SuccessResponse(
        message="Calendar summary metrics retrieved successfully",
        data=summary_data,
    )


@calendar_router.get(
    "/events/{event_id}",
    response_model=SuccessResponse[CalendarEventResponse],
    summary="Get full details of a specific calendar activity",
)
def get_calendar_event_details(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single calendar activity ensuring tenant boundary."""
    event = CalendarService.get_event_by_id(
        db=db,
        event_id=event_id,
        user_id=current_user.id,
    )
    return SuccessResponse(
        message="Calendar activity details retrieved successfully",
        data=event,
    )


@calendar_router.put(
    "/events/{event_id}",
    response_model=SuccessResponse[CalendarEventResponse],
    summary="Update an existing calendar activity",
)
def update_calendar_event(
    event_id: UUID,
    payload: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update title, dates, assignees, and parameters of an activity."""
    updated = CalendarService.update_event(
        db=db,
        event_id=event_id,
        user_id=current_user.id,
        payload=payload,
    )
    return SuccessResponse(
        message="Calendar activity updated successfully",
        data=updated,
    )


@calendar_router.patch(
    "/events/{event_id}/status",
    response_model=SuccessResponse[CalendarEventResponse],
    summary="Quick status transition for a calendar activity",
)
def update_calendar_event_status(
    event_id: UUID,
    payload: CalendarEventStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transition state (e.g. mark completed) with automatic completion timestamp recording."""
    updated = CalendarService.update_event_status(
        db=db,
        event_id=event_id,
        user_id=current_user.id,
        payload=payload,
    )
    return SuccessResponse(
        message=f"Calendar activity status updated to '{payload.status}'",
        data=updated,
    )


@calendar_router.delete(
    "/events/{event_id}",
    response_model=SuccessResponse[CalendarDeleteResponse],
    summary="Delete a calendar activity",
)
def delete_calendar_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Safely remove a scheduled activity without cascading to farm/crop assets."""
    res = CalendarService.delete_event(
        db=db,
        event_id=event_id,
        user_id=current_user.id,
    )
    return SuccessResponse(
        message=res.message,
        data=res,
    )


# -----------------------------------------------------------------------------
# Nested Convenience Endpoints
# -----------------------------------------------------------------------------

@calendar_convenience_router.get(
    "/farms/{farm_id}/calendar/events",
    response_model=SuccessResponse[List[CalendarEventResponse]],
    summary="List calendar activities linked to a specific farm",
)
def list_farm_calendar_events(
    farm_id: UUID,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    events = CalendarService.get_events(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
        status_filter=status,
    )
    return SuccessResponse(
        message=f"Calendar activities for farm '{farm_id}' retrieved successfully",
        data=events,
    )


@calendar_convenience_router.get(
    "/crops/{crop_id}/calendar/events",
    response_model=SuccessResponse[List[CalendarEventResponse]],
    summary="List calendar activities scheduled for a specific crop",
)
def list_crop_calendar_events(
    crop_id: UUID,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    events = CalendarService.get_events(
        db=db,
        user_id=current_user.id,
        crop_id=crop_id,
        status_filter=status,
    )
    return SuccessResponse(
        message=f"Calendar activities for crop '{crop_id}' retrieved successfully",
        data=events,
    )
