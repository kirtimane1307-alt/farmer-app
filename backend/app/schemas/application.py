"""Agricultural Application Pydantic schemas for request validation and response serialization."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Literal, List, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator


VALID_APPLICATION_CATEGORIES = ("fertilizer", "pesticide")
ApplicationCategoryType = Literal["fertilizer", "pesticide"]


class ApplicationBase(BaseModel):
    """Shared base properties for Agricultural Application."""
    application_category: ApplicationCategoryType = Field(
        ..., description="Application category ('fertilizer' or 'pesticide')"
    )
    product_name: str = Field(..., min_length=1, max_length=150, description="Commercial or common product name")
    product_type: str = Field(
        ...,
        min_length=1,
        max_length=60,
        description="Nutrient or pesticide classification (e.g. 'organic', 'chemical', 'insecticide')",
    )
    quantity: Decimal = Field(..., gt=0, description="Total dosage or quantity applied (must be > 0)")
    unit: str = Field(..., min_length=1, max_length=30, description="Measurement unit (e.g. 'kg', 'L', 'bags')")
    unit_cost: Optional[Decimal] = Field(None, ge=0, description="Optional unit purchase price in INR (>= 0)")
    total_cost: Optional[Decimal] = Field(None, ge=0, description="Total application expense in INR (>= 0)")
    application_date: date = Field(..., description="Date of field application")
    application_method: Optional[str] = Field(
        None, max_length=60, description="Method of application (e.g. 'spray', 'drip', 'broadcasting')"
    )
    purpose: Optional[str] = Field(
        None, max_length=255, description="Target nutrient, deficiency, weed, insect, or fungal disease"
    )
    notes: Optional[str] = Field(None, max_length=2000, description="Administrative notes or safety precautions")

    @field_validator("application_category", mode="before")
    @classmethod
    def normalize_category(cls, v: Any) -> str:
        if isinstance(v, str):
            clean = v.strip().lower()
            if clean in VALID_APPLICATION_CATEGORIES:
                return clean
        raise ValueError(
            f"Invalid application category. Must be one of: {', '.join(VALID_APPLICATION_CATEGORIES)}"
        )

    @field_validator("product_name", "product_type", "unit")
    @classmethod
    def validate_non_blank_strings(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field cannot be empty or purely whitespace")
        return v.strip()


class ApplicationCreate(ApplicationBase):
    """Schema for creating a new agricultural application."""
    farm_id: UUID = Field(..., description="Estate/Farm UUID")
    field_id: UUID = Field(..., description="Subdivided Plot/Field UUID")
    crop_id: Optional[UUID] = Field(None, description="Optional target Crop Cycle UUID")


class ApplicationUpdate(BaseModel):
    """Schema for editing an existing agricultural application."""
    farm_id: Optional[UUID] = None
    field_id: Optional[UUID] = None
    crop_id: Optional[UUID] = None
    application_category: Optional[ApplicationCategoryType] = None
    product_name: Optional[str] = Field(None, min_length=1, max_length=150)
    product_type: Optional[str] = Field(None, min_length=1, max_length=60)
    quantity: Optional[Decimal] = Field(None, gt=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=30)
    unit_cost: Optional[Decimal] = Field(None, ge=0)
    total_cost: Optional[Decimal] = Field(None, ge=0)
    application_date: Optional[date] = None
    application_method: Optional[str] = Field(None, max_length=60)
    purpose: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("application_category", mode="before")
    @classmethod
    def normalize_optional_category(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, str):
            clean = v.strip().lower()
            if clean in VALID_APPLICATION_CATEGORIES:
                return clean
        raise ValueError(
            f"Invalid application category. Must be one of: {', '.join(VALID_APPLICATION_CATEGORIES)}"
        )


class ApplicationResponse(ApplicationBase):
    """Serialized Agricultural Application model with farm, field, and crop metadata."""
    id: UUID
    farm_id: UUID
    farm_name: Optional[str] = None
    field_id: UUID
    field_name: Optional[str] = None
    crop_id: Optional[UUID] = None
    crop_name: Optional[str] = None
    crop_variety: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationSummaryResponse(BaseModel):
    """Aggregate statistics for fertilizer and pesticide application costs and activity."""
    total_applications_count: int
    fertilizer_applications_count: int
    pesticide_applications_count: int
    total_fertilizer_cost: Decimal
    total_pesticide_cost: Decimal
    total_combined_cost: Decimal


class ApplicationDeleteResponse(BaseModel):
    """Confirmation envelope for application deletion."""
    id: UUID
    deleted: bool = True
    message: str
