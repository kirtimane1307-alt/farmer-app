"""Attendance Pydantic schemas for request validation and response serialization."""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional, Literal, List, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator


VALID_ATTENDANCE_STATUSES = ("present", "absent", "half_day", "leave")
AttendanceStatusType = Literal["present", "absent", "half_day", "leave"]


def format_minutes_display(minutes: int) -> str:
    """Helper to format integer minutes to human-readable 'Xh Ym' string."""
    if minutes <= 0:
        return "0h"
    hours = minutes // 60
    mins = minutes % 60
    if hours > 0 and mins > 0:
        return f"{hours}h {mins}m"
    elif hours > 0:
        return f"{hours}h"
    else:
        return f"{mins}m"


class AttendanceBase(BaseModel):
    """Shared base properties for Attendance entity."""
    attendance_date: date = Field(..., description="Date of attendance")
    status: AttendanceStatusType = Field(default="present", description="Attendance status ('present', 'absent', 'half_day', 'leave')")
    check_in: Optional[time] = Field(None, description="Check-in clock time (e.g. '09:00:00' or '09:00')")
    check_out: Optional[time] = Field(None, description="Check-out clock time (e.g. '17:30:00' or '17:30')")
    overtime_minutes: int = Field(default=0, ge=0, description="Approved overtime in integer minutes (must be >= 0)")
    notes: Optional[str] = Field(None, max_length=2000, description="Optional administrative notes or tasks completed")

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v: Any) -> str:
        if isinstance(v, str):
            clean = v.strip().lower().replace(" ", "_").replace("-", "_")
            if clean in VALID_ATTENDANCE_STATUSES:
                return clean
        raise ValueError(
            f"Invalid attendance status. Must be one of: {', '.join(VALID_ATTENDANCE_STATUSES)}"
        )

    @field_validator("check_in", "check_out", mode="before")
    @classmethod
    def parse_optional_time(cls, v: Any) -> Optional[time]:
        if v is None or v == "" or (isinstance(v, str) and v.strip() == ""):
            return None
        if isinstance(v, str):
            cleaned = v.strip()
            # Handle formats like '09:00', '09:00:00', '9:00'
            parts = cleaned.split(":")
            if len(parts) >= 2:
                try:
                    hour = int(parts[0])
                    minute = int(parts[1])
                    second = int(parts[2]) if len(parts) > 2 else 0
                    return time(hour, minute, second)
                except ValueError:
                    pass
        return v

    @field_validator("overtime_minutes")
    @classmethod
    def validate_overtime(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Overtime minutes cannot be negative")
        return v


class AttendanceCreate(AttendanceBase):
    """Schema for creating a single attendance record."""
    labour_id: Optional[UUID] = Field(None, description="Worker UUID (optional if provided in route URL)")


class AttendanceUpdate(BaseModel):
    """Schema for updating an existing attendance record."""
    attendance_date: Optional[date] = None
    status: Optional[AttendanceStatusType] = None
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    overtime_minutes: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_optional_status(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, str):
            clean = v.strip().lower().replace(" ", "_").replace("-", "_")
            if clean in VALID_ATTENDANCE_STATUSES:
                return clean
        raise ValueError(
            f"Invalid attendance status. Must be one of: {', '.join(VALID_ATTENDANCE_STATUSES)}"
        )

    @field_validator("check_in", "check_out", mode="before")
    @classmethod
    def parse_optional_time(cls, v: Any) -> Optional[time]:
        if v is None or v == "" or (isinstance(v, str) and v.strip() == ""):
            return None
        if isinstance(v, str):
            cleaned = v.strip()
            parts = cleaned.split(":")
            if len(parts) >= 2:
                try:
                    hour = int(parts[0])
                    minute = int(parts[1])
                    second = int(parts[2]) if len(parts) > 2 else 0
                    return time(hour, minute, second)
                except ValueError:
                    pass
        return v


class AttendanceResponse(AttendanceBase):
    """Schema for serializing Attendance records with worker & farm metadata."""
    id: UUID
    labour_id: UUID
    labour_name: Optional[str] = None
    farm_id: Optional[UUID] = None
    farm_name: Optional[str] = None
    work_type: Optional[str] = None
    daily_wage: Optional[Decimal] = None
    working_minutes: int
    working_hours_formatted: str = "0h"
    overtime_hours_formatted: str = "0h"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AttendanceDeleteResponse(BaseModel):
    """Confirmation envelope for attendance record deletion."""
    id: UUID
    deleted: bool = True
    message: str


class BulkAttendanceItem(BaseModel):
    """Individual worker attendance entry for bulk submission."""
    labour_id: UUID
    status: AttendanceStatusType = Field(default="present")
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    overtime_minutes: int = Field(default=0, ge=0)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_bulk_status(cls, v: Any) -> str:
        if isinstance(v, str):
            clean = v.strip().lower().replace(" ", "_").replace("-", "_")
            if clean in VALID_ATTENDANCE_STATUSES:
                return clean
        raise ValueError(
            f"Invalid attendance status. Must be one of: {', '.join(VALID_ATTENDANCE_STATUSES)}"
        )

    @field_validator("check_in", "check_out", mode="before")
    @classmethod
    def parse_optional_time(cls, v: Any) -> Optional[time]:
        if v is None or v == "" or (isinstance(v, str) and v.strip() == ""):
            return None
        if isinstance(v, str):
            cleaned = v.strip()
            parts = cleaned.split(":")
            if len(parts) >= 2:
                try:
                    hour = int(parts[0])
                    minute = int(parts[1])
                    second = int(parts[2]) if len(parts) > 2 else 0
                    return time(hour, minute, second)
                except ValueError:
                    pass
        return v


class BulkAttendanceCreate(BaseModel):
    """Schema for submitting attendance for multiple workers simultaneously."""
    attendance_date: date = Field(..., description="Date for bulk attendance submission")
    farm_id: Optional[UUID] = Field(None, description="Optional farm filter/validation")
    records: List[BulkAttendanceItem] = Field(..., min_length=1, description="List of worker attendance items")


class BulkAttendanceResponse(BaseModel):
    """Summary envelope for bulk attendance operations."""
    attendance_date: date
    total_submitted: int
    created: int
    updated: int
    failed: int
    records: List[AttendanceResponse]
    errors: List[str] = []


class AttendanceDailySummary(BaseModel):
    """Aggregate statistics for attendance on a specific date."""
    attendance_date: date
    total_workers: int
    present: int
    absent: int
    half_day: int
    leave: int
    unmarked: int
    total_working_minutes: int
    total_working_hours_formatted: str
    total_overtime_minutes: int
    total_overtime_hours_formatted: str
