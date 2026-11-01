"""Pydantic schemas for Phase 19: Notifications & Reminders."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.models.notification import (
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_PRIORITIES,
    REMINDER_RECURRENCE_TYPES,
    REMINDER_STATUSES,
)


class NotificationBase(BaseModel):
    """Base notification attributes."""
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    category: str = Field(default="general")
    priority: str = Field(default="medium")
    related_module: Optional[str] = Field(None, max_length=50)
    related_record_id: Optional[str] = Field(None, max_length=100)
    action_url: Optional[str] = Field(None, max_length=255)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if cleaned not in NOTIFICATION_CATEGORIES:
            raise ValueError(f"Invalid category '{v}'. Allowed: {', '.join(NOTIFICATION_CATEGORIES)}")
        return cleaned

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if cleaned not in NOTIFICATION_PRIORITIES:
            raise ValueError(f"Invalid priority '{v}'. Allowed: {', '.join(NOTIFICATION_PRIORITIES)}")
        return cleaned


class NotificationCreate(NotificationBase):
    """Notification creation payload."""
    farm_id: Optional[UUID] = None


class NotificationResponse(NotificationBase):
    """Full notification response entity."""
    id: UUID
    user_id: UUID
    farm_id: Optional[UUID] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    farm_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class NotificationSummary(BaseModel):
    """Notification counter telemetry summary."""
    total_notifications: int = 0
    unread_notifications: int = 0
    urgent_notifications: int = 0
    active_reminders: int = 0
    overdue_reminders: int = 0

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class ReminderBase(BaseModel):
    """Base reminder attributes."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    farm_id: Optional[UUID] = None
    field_id: Optional[UUID] = None
    crop_id: Optional[UUID] = None
    category: str = Field(default="general")
    priority: str = Field(default="medium")
    reminder_datetime: datetime
    recurrence_type: str = Field(default="none")
    recurrence_interval: int = Field(default=1, ge=1, le=365)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if cleaned not in NOTIFICATION_CATEGORIES:
            raise ValueError(f"Invalid category '{v}'. Allowed: {', '.join(NOTIFICATION_CATEGORIES)}")
        return cleaned

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if cleaned not in NOTIFICATION_PRIORITIES:
            raise ValueError(f"Invalid priority '{v}'. Allowed: {', '.join(NOTIFICATION_PRIORITIES)}")
        return cleaned

    @field_validator("recurrence_type")
    @classmethod
    def validate_recurrence_type(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if cleaned not in REMINDER_RECURRENCE_TYPES:
            raise ValueError(f"Invalid recurrence type '{v}'. Allowed: {', '.join(REMINDER_RECURRENCE_TYPES)}")
        return cleaned


class ReminderCreate(ReminderBase):
    """Reminder creation schema."""
    pass


class ReminderUpdate(BaseModel):
    """Reminder modification schema."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    farm_id: Optional[UUID] = None
    field_id: Optional[UUID] = None
    crop_id: Optional[UUID] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    reminder_datetime: Optional[datetime] = None
    recurrence_type: Optional[str] = None
    recurrence_interval: Optional[int] = Field(None, ge=1, le=365)
    status: Optional[str] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip().lower()
        if cleaned not in NOTIFICATION_CATEGORIES:
            raise ValueError(f"Invalid category '{v}'. Allowed: {', '.join(NOTIFICATION_CATEGORIES)}")
        return cleaned

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip().lower()
        if cleaned not in NOTIFICATION_PRIORITIES:
            raise ValueError(f"Invalid priority '{v}'. Allowed: {', '.join(NOTIFICATION_PRIORITIES)}")
        return cleaned

    @field_validator("recurrence_type")
    @classmethod
    def validate_recurrence_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip().lower()
        if cleaned not in REMINDER_RECURRENCE_TYPES:
            raise ValueError(f"Invalid recurrence type '{v}'. Allowed: {', '.join(REMINDER_RECURRENCE_TYPES)}")
        return cleaned

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip().lower()
        if cleaned not in REMINDER_STATUSES:
            raise ValueError(f"Invalid status '{v}'. Allowed: {', '.join(REMINDER_STATUSES)}")
        return cleaned

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class ReminderResponse(ReminderBase):
    """Full reminder response entity."""
    id: UUID
    user_id: UUID
    status: str
    completed_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    farm_name: Optional[str] = None
    field_name: Optional[str] = None
    crop_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class NotificationPreferenceItem(BaseModel):
    """Notification preference item for a specific category."""
    category: str
    is_enabled: bool = True
    advance_notice_days: int = Field(default=1, ge=0, le=30)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if cleaned not in NOTIFICATION_CATEGORIES:
            raise ValueError(f"Invalid category '{v}'. Allowed: {', '.join(NOTIFICATION_CATEGORIES)}")
        return cleaned


class NotificationPreferencesUpdate(BaseModel):
    """Batch preference update request."""
    preferences: List[NotificationPreferenceItem]


class NotificationPreferenceResponse(BaseModel):
    """Notification preference entry response."""
    id: UUID
    user_id: UUID
    category: str
    is_enabled: bool
    advance_notice_days: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class ScanResultsResponse(BaseModel):
    """Result of automated background scan."""
    scanned_at: datetime
    notifications_created: int
    reminders_evaluated: int
    details: List[str] = []

