"""Farm Pydantic schemas for request validation and response serialization."""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator


class FarmBase(BaseModel):
    """Shared properties for Farm entity."""
    name: str = Field(..., min_length=2, max_length=120, description="Name of the farm property")
    location: str = Field(..., min_length=2, max_length=255, description="Physical geographical location/address")
    total_area: Decimal = Field(..., gt=0, description="Total acreage or area measurement of the farm")
    area_unit: str = Field(default="acres", max_length=20, description="Unit of measurement (e.g. acres, hectares, guntha)")

    @field_validator("name", "location")
    @classmethod
    def strip_and_validate_non_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field cannot be empty or whitespace only")
        return stripped


class FarmCreate(BaseModel):
    """Schema for creating a farm by the authenticated user."""
    name: str = Field(..., min_length=2, max_length=120, description="Name of the farm property")
    location: str = Field(..., min_length=2, max_length=255, description="Physical geographical location/address")
    total_area: Decimal = Field(..., gt=0, description="Total acreage or area measurement of the farm")
    area_unit: str = Field(default="acres", max_length=20, description="Unit of measurement")

    @field_validator("name", "location")
    @classmethod
    def strip_and_validate_non_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field cannot be empty or whitespace only")
        return stripped


class FarmUpdate(BaseModel):
    """Schema for updating an existing farm."""
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    location: Optional[str] = Field(None, min_length=2, max_length=255)
    total_area: Optional[Decimal] = Field(None, gt=0)
    area_unit: Optional[str] = Field(None, max_length=20)

    @field_validator("name", "location")
    @classmethod
    def strip_optional_fields(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Field cannot be whitespace only")
            return stripped
        return v


class FarmResponse(FarmBase):
    """Schema for serializing Farm responses."""
    id: UUID
    user_id: UUID
    field_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FarmDeleteResponse(BaseModel):
    """Schema for confirming farm deletion."""
    id: UUID
    deleted: bool = True
    fields_removed: int = 0
    message: str
