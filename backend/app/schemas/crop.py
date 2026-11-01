"""Crop Pydantic schemas for request validation and response serialization."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator

VALID_CROP_STATUSES = ("planned", "growing", "ready_to_harvest", "harvested", "failed")
CropStatusType = Literal["planned", "growing", "ready_to_harvest", "harvested", "failed"]


class CropBase(BaseModel):
    """Shared base properties for Crop cultivation entity."""
    name: str = Field(..., min_length=1, max_length=120, description="Crop name (e.g. Wheat, Basmati Rice, Cotton)")
    variety: str = Field(..., min_length=1, max_length=120, description="Seed/Cultivar variety (e.g. HD-2967, Hybrid 101)")
    season: Optional[str] = Field(None, max_length=60, description="Agricultural season (e.g. Kharif, Rabi, Zaid, Summer)")
    sowing_date: date = Field(..., description="Date of sowing or seedling plantation")
    expected_harvest_date: Optional[date] = Field(None, description="Projected maturity and harvest date")
    actual_harvest_date: Optional[date] = Field(None, description="Actual completion harvest date")
    status: CropStatusType = Field(default="planned", description="Current lifecycle phase")
    planted_area: Optional[Decimal] = Field(None, gt=0, description="Dedicated cultivation area")
    planted_area_unit: str = Field(default="acres", max_length=20, description="Unit of measurement for planted area")
    seed_quantity: Optional[Decimal] = Field(None, gt=0, description="Total seed volume or weight applied")
    seed_unit: Optional[str] = Field(default="kg", max_length=20, description="Seed quantity measurement unit")
    notes: Optional[str] = Field(None, max_length=2000, description="Agronomic observations or instructions")

    @field_validator("name", "variety")
    @classmethod
    def strip_and_validate_required_text(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field cannot be empty or whitespace only")
        return stripped

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean not in VALID_CROP_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_CROP_STATUSES)}")
        return clean


class CropCreate(CropBase):
    """Schema for registering a new crop cycle under a field plot."""
    field_id: Optional[UUID] = Field(None, description="Target field plot ID (optional in body when specified in route)")


class CropUpdate(BaseModel):
    """Schema for updating crop lifecycle and agronomic metrics."""
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    variety: Optional[str] = Field(None, min_length=1, max_length=120)
    season: Optional[str] = Field(None, max_length=60)
    sowing_date: Optional[date] = None
    expected_harvest_date: Optional[date] = None
    actual_harvest_date: Optional[date] = None
    status: Optional[CropStatusType] = None
    planted_area: Optional[Decimal] = Field(None, gt=0)
    planted_area_unit: Optional[str] = Field(None, max_length=20)
    seed_quantity: Optional[Decimal] = Field(None, gt=0)
    seed_unit: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("name", "variety")
    @classmethod
    def strip_optional_text(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Field cannot be whitespace only")
            return stripped
        return v

    @field_validator("status")
    @classmethod
    def validate_optional_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip().lower()
            if clean not in VALID_CROP_STATUSES:
                raise ValueError(f"Status must be one of: {', '.join(VALID_CROP_STATUSES)}")
            return clean
        return v


class CropResponse(CropBase):
    """Schema for serializing Crop records with parent estate metadata."""
    id: UUID
    field_id: UUID
    field_name: Optional[str] = None
    farm_id: Optional[UUID] = None
    farm_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CropDeleteResponse(BaseModel):
    """Confirmation envelope for crop cycle removal."""
    id: UUID
    deleted: bool = True
    message: str
