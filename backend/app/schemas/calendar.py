"""Pydantic schemas for Farm Calendar & Activity Management (Phase 16)."""

from datetime import datetime
from typing import Optional, List, Dict
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from app.models.calendar import (
    CALENDAR_ACTIVITY_TYPES,
    CALENDAR_EVENT_STATUSES,
    CALENDAR_EVENT_PRIORITIES,
)


class CalendarEventBase(BaseModel):
    """Base fields shared across calendar event creation and updates."""

    title: str = Field(..., min_length=1, max_length=200, description="Activity title or headline")
    description: Optional[str] = Field(None, max_length=2000, description="Detailed activity description")
    activity_type: str = Field(
        default="general_task",
        description="Type of agricultural operation",
    )
    start_datetime: datetime = Field(..., description="Scheduled start date and time")
    end_datetime: Optional[datetime] = Field(None, description="Scheduled end date and time")
    all_day: bool = Field(default=False, description="Flag for full-day activity")
    status: str = Field(default="planned", description="Workflow state (planned, in_progress, completed, cancelled)")
    priority: str = Field(default="medium", description="Operational urgency (low, medium, high)")
    related_module: Optional[str] = Field(None, max_length=60, description="Linked module e.g. fertilizer, harvest")
    related_record_id: Optional[str] = Field(None, max_length=100, description="Identifier of linked record")
    notes: Optional[str] = Field(None, max_length=2000, description="Internal field notes or observations")

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Activity title cannot be empty.")
        return cleaned

    @field_validator("activity_type")
    @classmethod
    def validate_activity_type(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if cleaned not in CALENDAR_ACTIVITY_TYPES:
            raise ValueError(
                f"Invalid activity type '{v}'. Must be one of: {', '.join(CALENDAR_ACTIVITY_TYPES)}"
            )
        return cleaned

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if cleaned not in CALENDAR_EVENT_STATUSES:
            raise ValueError(
                f"Invalid event status '{v}'. Must be one of: {', '.join(CALENDAR_EVENT_STATUSES)}"
            )
        return cleaned

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if cleaned not in CALENDAR_EVENT_PRIORITIES:
            raise ValueError(
                f"Invalid priority '{v}'. Must be one of: {', '.join(CALENDAR_EVENT_PRIORITIES)}"
            )
        return cleaned

    @model_validator(mode="after")
    def validate_dates(self) -> "CalendarEventBase":
        if self.end_datetime and self.start_datetime:
            if self.end_datetime < self.start_datetime:
                raise ValueError("End date/time cannot be earlier than start date/time.")
        return self


class CalendarEventCreate(CalendarEventBase):
    """Payload to schedule a new farm calendar activity."""

    farm_id: UUID = Field(..., description="Target farm identifier")
    field_id: Optional[UUID] = Field(None, description="Optional field sector assignment")
    crop_id: Optional[UUID] = Field(None, description="Optional crop cycle assignment")
    assigned_labour_id: Optional[UUID] = Field(None, description="Optional worker assigned to lead task")
    actual_completion_datetime: Optional[datetime] = Field(None, description="Timestamp when task was marked finished")


class CalendarEventUpdate(BaseModel):
    """Payload to modify an existing calendar event."""

    farm_id: Optional[UUID] = None
    field_id: Optional[UUID] = None
    crop_id: Optional[UUID] = None
    assigned_labour_id: Optional[UUID] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    activity_type: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    all_day: Optional[bool] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    related_module: Optional[str] = Field(None, max_length=60)
    related_record_id: Optional[str] = Field(None, max_length=100)
    actual_completion_datetime: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Activity title cannot be empty.")
            return cleaned
        return None

    @field_validator("activity_type")
    @classmethod
    def validate_activity_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip().lower()
            if cleaned not in CALENDAR_ACTIVITY_TYPES:
                raise ValueError(
                    f"Invalid activity type '{v}'. Must be one of: {', '.join(CALENDAR_ACTIVITY_TYPES)}"
                )
            return cleaned
        return None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip().lower()
            if cleaned not in CALENDAR_EVENT_STATUSES:
                raise ValueError(
                    f"Invalid status '{v}'. Must be one of: {', '.join(CALENDAR_EVENT_STATUSES)}"
                )
            return cleaned
        return None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip().lower()
            if cleaned not in CALENDAR_EVENT_PRIORITIES:
                raise ValueError(
                    f"Invalid priority '{v}'. Must be one of: {', '.join(CALENDAR_EVENT_PRIORITIES)}"
                )
            return cleaned
        return None

    @model_validator(mode="after")
    def validate_dates(self) -> "CalendarEventUpdate":
        if self.end_datetime and self.start_datetime:
            if self.end_datetime < self.start_datetime:
                raise ValueError("End date/time cannot be earlier than start date/time.")
        return self


class CalendarEventStatusUpdate(BaseModel):
    """Payload for quickly transitioning task state."""

    status: str = Field(..., description="Target status ('planned', 'in_progress', 'completed', 'cancelled')")
    actual_completion_datetime: Optional[datetime] = Field(
        None, description="Completion timestamp (defaults to current time if completed)"
    )
    notes: Optional[str] = Field(None, max_length=2000, description="Status change commentary")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if cleaned not in CALENDAR_EVENT_STATUSES:
            raise ValueError(
                f"Invalid status '{v}'. Must be one of: {', '.join(CALENDAR_EVENT_STATUSES)}"
            )
        return cleaned


class CalendarEventResponse(CalendarEventBase):
    """Response representation of a farm calendar activity."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farm_id: UUID
    field_id: Optional[UUID] = None
    crop_id: Optional[UUID] = None
    assigned_labour_id: Optional[UUID] = None
    created_by_id: Optional[UUID] = None
    actual_completion_datetime: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Resolved display metadata
    farm_name: Optional[str] = None
    field_name: Optional[str] = None
    crop_name: Optional[str] = None
    assigned_labour_name: Optional[str] = None
    created_by_name: Optional[str] = None


class CalendarSummaryResponse(BaseModel):
    """Summary KPI metrics for calendar events in requested time window."""

    total_events: int = 0
    planned_count: int = 0
    in_progress_count: int = 0
    completed_count: int = 0
    cancelled_count: int = 0
    overdue_count: int = 0
    high_priority_count: int = 0
    activity_breakdown: Dict[str, int] = Field(default_factory=dict)


class CalendarDeleteResponse(BaseModel):
    """Standardized response after deleting a calendar event."""

    success: bool = True
    message: str
    deleted_event_id: UUID
