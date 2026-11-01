"""Pydantic schemas for Harvest Management."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.models.harvest import HARVEST_UNITS, QUALITY_GRADES, HARVEST_METHODS


class HarvestBase(BaseModel):
    """Base fields for a harvest record."""

    harvest_date: date = Field(..., description="Date of harvesting")
    quantity: Decimal = Field(..., gt=0, description="Harvested produce quantity (must be strictly positive)")
    unit: str = Field(default="kg", min_length=1, max_length=30, description="Measurement unit (e.g. kg, quintals, tonnes, bags, crates, pieces)")
    quality_grade: Optional[str] = Field(default="Standard", max_length=30, description="Quality grade classification")
    harvest_method: Optional[str] = Field(None, max_length=60, description="Harvest method (Manual, Machine, Combined, etc.)")
    storage_location: Optional[str] = Field(None, max_length=150, description="Designated storage location, bin, or warehouse")
    batch_number: Optional[str] = Field(None, max_length=100, description="Batch, lot, or tracking reference")
    notes: Optional[str] = Field(None, max_length=2000, description="Additional agronomic or quality observations")

    @field_validator("quantity")
    @classmethod
    def validate_positive_quantity(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0"):
            raise ValueError("Harvest quantity must be greater than zero.")
        return v.quantize(Decimal("0.01"))

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Measurement unit cannot be empty.")
        lowered = stripped.lower()
        if lowered in HARVEST_UNITS:
            return lowered
        return stripped

    @field_validator("quality_grade")
    @classmethod
    def validate_quality_grade(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                return "Not specified"
            for grade in QUALITY_GRADES:
                if stripped.lower() == grade.lower():
                    return grade
            return stripped
        return "Not specified"


class HarvestCreate(HarvestBase):
    """Payload for recording a new crop harvest."""

    farm_id: Optional[UUID] = Field(None, description="Farm UUID (can be inferred from field/crop)")
    field_id: Optional[UUID] = Field(None, description="Field UUID (can be inferred from crop)")
    crop_id: UUID = Field(..., description="Target Crop cycle UUID")


class HarvestUpdate(BaseModel):
    """Payload for updating an existing harvest record."""

    farm_id: Optional[UUID] = None
    field_id: Optional[UUID] = None
    crop_id: Optional[UUID] = None
    harvest_date: Optional[date] = None
    quantity: Optional[Decimal] = Field(None, gt=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=30)
    quality_grade: Optional[str] = Field(None, max_length=30)
    harvest_method: Optional[str] = Field(None, max_length=60)
    storage_location: Optional[str] = Field(None, max_length=150)
    batch_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("quantity")
    @classmethod
    def validate_positive_quantity(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            if v <= Decimal("0"):
                raise ValueError("Harvest quantity must be greater than zero.")
            return v.quantize(Decimal("0.01"))
        return v

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Measurement unit cannot be empty.")
            lowered = stripped.lower()
            if lowered in HARVEST_UNITS:
                return lowered
            return stripped
        return v


class HarvestResponse(BaseModel):
    """Response representation of a Harvest record with related entity names."""

    id: UUID
    farm_id: UUID
    farm_name: Optional[str] = None
    field_id: UUID
    field_name: Optional[str] = None
    crop_id: UUID
    crop_name: Optional[str] = None
    crop_variety: Optional[str] = None
    harvest_date: date
    quantity: Decimal
    unit: str
    quality_grade: Optional[str] = None
    harvest_method: Optional[str] = None
    storage_location: Optional[str] = None
    batch_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CropHarvestSummary(BaseModel):
    """Summary of harvests aggregated for a single crop."""

    crop_id: UUID
    crop_name: str
    crop_variety: str
    harvest_count: int
    quantities_by_unit: Dict[str, Decimal] = Field(default_factory=dict)
    metric_weight_kg: Optional[Decimal] = None


class FieldHarvestSummary(BaseModel):
    """Summary of harvests aggregated for a single field plot."""

    field_id: UUID
    field_name: str
    harvest_count: int
    quantities_by_unit: Dict[str, Decimal] = Field(default_factory=dict)
    metric_weight_kg: Optional[Decimal] = None


class HarvestSummaryResponse(BaseModel):
    """Dashboard-level telemetry and aggregated yield metrics."""

    total_harvests: int = 0
    total_metric_weight_kg: Decimal = Decimal("0.00")
    by_unit: Dict[str, Decimal] = Field(default_factory=dict)
    by_quality_grade: Dict[str, int] = Field(default_factory=dict)
    by_crop: List[CropHarvestSummary] = Field(default_factory=list)
    by_field: List[FieldHarvestSummary] = Field(default_factory=list)
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class HarvestDeleteResponse(BaseModel):
    """Response confirming harvest record deletion."""

    id: UUID
    deleted: bool
    message: str
