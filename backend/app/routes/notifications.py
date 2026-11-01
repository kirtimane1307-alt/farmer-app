"""FastAPI route endpoints for Notifications, Reminders, and Notification Preferences (Phase 19)."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.notification import (
    NotificationResponse,
    NotificationSummary,
    ReminderCreate,
    ReminderUpdate,
    ReminderResponse,
    NotificationPreferenceItem,
    NotificationPreferencesUpdate,
    ScanResultsResponse,
)
from app.services import notification_service

notifications_router = APIRouter(tags=["Notifications & Reminders"])
reminders_router = APIRouter(tags=["Notifications & Reminders"])
preferences_router = APIRouter(tags=["Notifications & Reminders"])


# ===========================================================================
# Notification Endpoints
# ===========================================================================

@notifications_router.get(
    "",
    response_model=SuccessResponse[List[NotificationResponse]],
    summary="List all notifications with filtering",
)
def list_user_notifications(
    farm_id: Optional[UUID] = Query(None, description="Filter by farm estate"),
    category: Optional[str] = Query(None, description="Filter by notification category"),
    priority: Optional[str] = Query(None, description="Filter by priority (low, medium, high, urgent)"),
    is_read: Optional[bool] = Query(None, description="Filter by read/unread status"),
    search: Optional[str] = Query(None, description="Search keyword in title or message"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Offset index"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve notifications belonging to the authenticated user."""
    items, total = notification_service.list_notifications(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        category=category,
        priority=priority,
        is_read=is_read,
        search=search,
        limit=limit,
        offset=offset,
    )
    return SuccessResponse(
        message=f"Retrieved {len(items)} notification(s)",
        data=items,
    )


@notifications_router.get(
    "/summary",
    response_model=SuccessResponse[NotificationSummary],
    summary="Get notification counts and telemetry summary",
)
def get_user_notification_summary(
    farm_id: Optional[UUID] = Query(None, description="Filter summary by farm estate"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get total, unread, urgent, and active reminder counts."""
    summary = notification_service.get_notification_summary(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
    )
    return SuccessResponse(
        message="Notification summary retrieved successfully",
        data=summary,
    )


@notifications_router.patch(
    "/{notification_id}/read",
    response_model=SuccessResponse[NotificationResponse],
    summary="Mark single notification as read",
)
def mark_notification_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read for authenticated user."""
    notif = notification_service.mark_as_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id,
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access denied",
        )
    return SuccessResponse(
        message="Notification marked as read",
        data=notif,
    )


@notifications_router.post(
    "/mark-all-read",
    response_model=SuccessResponse[dict],
    summary="Mark all user notifications as read",
)
def mark_all_user_notifications_read(
    farm_id: Optional[UUID] = Query(None, description="Optional farm filter"),
    category: Optional[str] = Query(None, description="Optional category filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all unread notifications matching criteria as read."""
    count = notification_service.mark_all_as_read(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        category=category,
    )
    return SuccessResponse(
        message=f"Marked {count} notification(s) as read",
        data={"updated_count": count},
    )


@notifications_router.delete(
    "/{notification_id}",
    response_model=SuccessResponse[dict],
    summary="Delete a notification",
)
def delete_user_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification owned by the current user."""
    success = notification_service.delete_notification(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access denied",
        )
    return SuccessResponse(
        message="Notification deleted successfully",
        data={"deleted": True},
    )


@notifications_router.post(
    "/scan",
    response_model=SuccessResponse[ScanResultsResponse],
    summary="Trigger operational record scan and generate alerts",
)
def trigger_operational_scan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run an immediate scan of real farm records and generate due notifications."""
    result = notification_service.scan_and_generate_alerts(
        db=db,
        user_id=current_user.id,
    )
    return SuccessResponse(
        message="Farm scan executed successfully",
        data=result,
    )


# ===========================================================================
# Reminder Endpoints
# ===========================================================================

@reminders_router.get(
    "",
    response_model=SuccessResponse[List[ReminderResponse]],
    summary="List custom reminders with optional filters",
)
def list_user_reminders(
    farm_id: Optional[UUID] = Query(None, description="Filter by farm estate"),
    status: Optional[str] = Query(None, description="Filter by status (pending, completed, overdue, dismissed)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    search: Optional[str] = Query(None, description="Search keyword in title or description"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List agricultural reminders created by user."""
    items, total = notification_service.list_reminders(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        status=status,
        category=category,
        priority=priority,
        search=search,
        limit=limit,
        offset=offset,
    )
    return SuccessResponse(
        message=f"Retrieved {len(items)} reminder(s)",
        data=items,
    )


@reminders_router.post(
    "",
    response_model=SuccessResponse[ReminderResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new farm reminder",
)
def create_user_reminder(
    payload: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new custom reminder."""
    reminder = notification_service.create_reminder(
        db=db,
        user_id=current_user.id,
        data=payload,
    )
    return SuccessResponse(
        message="Reminder created successfully",
        data=reminder,
    )


@reminders_router.get(
    "/{reminder_id}",
    response_model=SuccessResponse[ReminderResponse],
    summary="Get a reminder by ID",
)
def get_user_reminder(
    reminder_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve details of a single reminder."""
    rem = notification_service.get_reminder(
        db=db,
        reminder_id=reminder_id,
        user_id=current_user.id,
    )
    if not rem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found or access denied",
        )
    return SuccessResponse(
        message="Reminder retrieved successfully",
        data=rem,
    )


@reminders_router.put(
    "/{reminder_id}",
    response_model=SuccessResponse[ReminderResponse],
    summary="Update a reminder",
)
def update_user_reminder(
    reminder_id: UUID,
    payload: ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update reminder properties."""
    updated = notification_service.update_reminder(
        db=db,
        reminder_id=reminder_id,
        user_id=current_user.id,
        data=payload,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found or access denied",
        )
    return SuccessResponse(
        message="Reminder updated successfully",
        data=updated,
    )


@reminders_router.patch(
    "/{reminder_id}/complete",
    response_model=SuccessResponse[ReminderResponse],
    summary="Mark reminder as completed",
)
def complete_user_reminder(
    reminder_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark reminder completed (handles recurring schedule rollover)."""
    completed = notification_service.complete_reminder(
        db=db,
        reminder_id=reminder_id,
        user_id=current_user.id,
    )
    if not completed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found or access denied",
        )
    return SuccessResponse(
        message="Reminder marked as completed",
        data=completed,
    )


@reminders_router.delete(
    "/{reminder_id}",
    response_model=SuccessResponse[dict],
    summary="Delete a reminder",
)
def delete_user_reminder(
    reminder_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a reminder owned by current user."""
    success = notification_service.delete_reminder(
        db=db,
        reminder_id=reminder_id,
        user_id=current_user.id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found or access denied",
        )
    return SuccessResponse(
        message="Reminder deleted successfully",
        data={"deleted": True},
    )


# ===========================================================================
# Notification Preference Endpoints
# ===========================================================================

@preferences_router.get(
    "",
    response_model=SuccessResponse[List[NotificationPreferenceItem]],
    summary="Get user notification preferences",
)
def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get notification preferences and advance notice windows."""
    prefs = notification_service.get_user_preferences(
        db=db,
        user_id=current_user.id,
    )
    return SuccessResponse(
        message="Notification preferences retrieved successfully",
        data=prefs,
    )


@preferences_router.put(
    "",
    response_model=SuccessResponse[List[NotificationPreferenceItem]],
    summary="Update user notification preferences",
)
def update_preferences(
    payload: NotificationPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update notification preferences for user."""
    updated = notification_service.update_user_preferences(
        db=db,
        user_id=current_user.id,
        preferences=payload.preferences,
    )
    return SuccessResponse(
        message="Notification preferences updated successfully",
        data=updated,
    )

