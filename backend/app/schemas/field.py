"""Field/Plot Pydantic schemas for request validation and response serialization."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator


class FieldBase(BaseModel):
    """Shared properties for Field/Plot entity."""
    name: str = Field(..., min_length=1, max_length=120, description="Field name or plot identifier")
    area: Decimal = Field(..., gt=0, description="Area of this plot")
    area_unit: str = Field(default="acres", max_length=20, description="Unit of measurement")
    soil_type: Optional[str] = Field(None, max_length=60, description="Soil classification")
    irrigation_type: Optional[str] = Field(None, max_length=60, description="Primary irrigation method")
    description: Optional[str] = Field(None, max_length=1000, description="Detailed field notes or coordinates")

    @field_validator("name")
    @classmethod
    def strip_and_validate_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field name cannot be empty or whitespace only")
        return stripped


class FieldCreate(FieldBase):
    """Schema for adding a field under an existing farm."""
    farm_id: Optional[UUID] = Field(None, description="ID of the parent farm (optional in body when specified in URL path)")


class FieldUpdate(BaseModel):
    """Schema for updating field properties."""
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    area: Optional[Decimal] = Field(None, gt=0)
    area_unit: Optional[str] = Field(None, max_length=20)
    soil_type: Optional[str] = Field(None, max_length=60)
    irrigation_type: Optional[str] = Field(None, max_length=60)
    description: Optional[str] = Field(None, max_length=1000)

    @field_validator("name")
    @classmethod
    def strip_optional_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Field name cannot be whitespace only")
            return stripped
        return v


class FieldResponse(FieldBase):
    """Schema for serializing Field responses."""
    id: UUID
    farm_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FieldDeleteResponse(BaseModel):
    """Schema for confirming field deletion."""
    id: UUID
    deleted: bool = True
    message: str
