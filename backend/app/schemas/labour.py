"""Labour Pydantic schemas for request validation and response serialization."""

import re
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator

VALID_LABOUR_STATUSES = ("active", "inactive")
LabourStatusType = Literal["active", "inactive"]

COMMON_WORK_TYPES = (
    "General Labour",
    "Tractor Operator",
    "Irrigation Worker",
    "Harvest Worker",
    "Field Worker",
    "Other",
)


class LabourBase(BaseModel):
    """Shared base properties for Labour entity."""
    name: str = Field(..., min_length=1, max_length=120, description="Worker's full legal name")
    phone: Optional[str] = Field(None, max_length=30, description="Worker's contact phone number")
    address: Optional[str] = Field(None, max_length=255, description="Residential or local address")
    work_type: str = Field(default="General Labour", min_length=1, max_length=60, description="Primary trade or responsibility")
    daily_wage: Decimal = Field(..., ge=0, description="Agreed daily compensation wage rate (must be >= 0)")
    joining_date: date = Field(..., description="Date employment commenced")
    status: LabourStatusType = Field(default="active", description="Employment status ('active' or 'inactive')")
    notes: Optional[str] = Field(None, max_length=2000, description="Optional administrative or performance remarks")

    @field_validator("name")
    @classmethod
    def strip_and_validate_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Worker name cannot be empty or whitespace only")
        return stripped

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        stripped = v.strip()
        if not stripped:
            return None
        # Allow reasonable phone formats (e.g. +91 9876543210, 9876543210, 09876543210, with optional dashes/spaces)
        digits = re.sub(r"[\s\-\(\)\+]", "", stripped)
        if len(digits) < 7 or len(digits) > 15:
            raise ValueError("Phone number must contain between 7 and 15 digits")
        return stripped

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean not in VALID_LABOUR_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_LABOUR_STATUSES)}")
        return clean

    @field_validator("work_type")
    @classmethod
    def validate_work_type(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            return "General Labour"
        return stripped


class LabourCreate(LabourBase):
    """Schema for registering a new worker under a farm."""
    farm_id: Optional[UUID] = Field(None, description="Assigned farm estate ID (optional in body when specified in route)")


class LabourUpdate(BaseModel):
    """Schema for updating worker records and status."""
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = Field(None, max_length=255)
    work_type: Optional[str] = Field(None, min_length=1, max_length=60)
    daily_wage: Optional[Decimal] = Field(None, ge=0)
    joining_date: Optional[date] = None
    status: Optional[LabourStatusType] = None
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("name")
    @classmethod
    def strip_optional_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Worker name cannot be empty or whitespace only")
            return stripped
        return v

    @field_validator("phone")
    @classmethod
    def validate_optional_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        stripped = v.strip()
        if not stripped:
            return None
        digits = re.sub(r"[\s\-\(\)\+]", "", stripped)
        if len(digits) < 7 or len(digits) > 15:
            raise ValueError("Phone number must contain between 7 and 15 digits")
        return stripped

    @field_validator("status")
    @classmethod
    def validate_optional_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip().lower()
            if clean not in VALID_LABOUR_STATUSES:
                raise ValueError(f"Status must be one of: {', '.join(VALID_LABOUR_STATUSES)}")
            return clean
        return v

    @field_validator("work_type")
    @classmethod
    def validate_optional_work_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Work type cannot be empty")
            return stripped
        return v


class LabourResponse(LabourBase):
    """Schema for serializing Labour records with farm metadata."""
    id: UUID
    farm_id: UUID
    farm_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LabourDeleteResponse(BaseModel):
    """Confirmation envelope for labour deactivation or deletion."""
    id: UUID
    name: Optional[str] = None
    deactivated: bool = True
    status: str
    message: str


class LabourStats(BaseModel):
    """Aggregate statistics for labour workforce."""
    total_workers: int
    active_workers: int
    inactive_workers: int
