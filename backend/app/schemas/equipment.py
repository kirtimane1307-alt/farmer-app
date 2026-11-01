"""Pydantic schemas for Phase 13: Equipment & Machinery Management."""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.models.equipment import (
    EQUIPMENT_CONDITIONS,
    OPERATIONAL_STATUSES,
    MAINTENANCE_TYPES,
    MAINTENANCE_TYPE_LABELS,
)


class EquipmentBase(BaseModel):
    """Base equipment schema with common attributes."""

    model_config = ConfigDict(protected_namespaces=())

    equipment_name: str = Field(..., min_length=1, max_length=150, description="Equipment / Implement name")
    equipment_type: str = Field(..., min_length=1, max_length=60, description="Category of equipment")
    brand: Optional[str] = Field(None, max_length=100, description="Manufacturer / brand name")
    model_number: Optional[str] = Field(None, max_length=100, description="Model or version number")
    serial_number: Optional[str] = Field(None, max_length=100, description="Serial number")
    purchase_date: Optional[date] = Field(None, description="Date of purchase")
    purchase_price: Optional[Decimal] = Field(None, ge=0, description="Purchase price in INR (non-negative)")
    supplier_name: Optional[str] = Field(None, max_length=150, description="Vendor or dealership")
    quantity: int = Field(default=1, gt=0, description="Quantity of equipment (strictly > 0)")
    condition: str = Field(default="good", description="Physical condition")
    operational_status: str = Field(default="available", description="Current operating status")
    fuel_type: Optional[str] = Field(None, max_length=50, description="Fuel / power source")
    identification_number: Optional[str] = Field(None, max_length=100, description="Registration / tag number")
    warranty_expiry_date: Optional[date] = Field(None, description="Warranty expiry date")
    last_service_date: Optional[date] = Field(None, description="Last service date")
    next_service_date: Optional[date] = Field(None, description="Scheduled next service date")
    notes: Optional[str] = Field(None, description="Additional notes or specifications")

    @field_validator("equipment_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Equipment name cannot be empty or whitespace only.")
        return stripped

    @field_validator("condition")
    @classmethod
    def validate_condition(cls, v: str) -> str:
        lowered = v.strip().lower()
        if lowered not in EQUIPMENT_CONDITIONS:
            raise ValueError(f"Invalid condition '{v}'. Allowed: {', '.join(EQUIPMENT_CONDITIONS)}")
        return lowered

    @field_validator("operational_status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        lowered = v.strip().lower()
        if lowered not in OPERATIONAL_STATUSES:
            raise ValueError(f"Invalid operational status '{v}'. Allowed: {', '.join(OPERATIONAL_STATUSES)}")
        return lowered


class EquipmentCreate(EquipmentBase):
    """Payload for registering new equipment."""

    farm_id: UUID = Field(..., description="Target farm estate UUID")
    field_id: Optional[UUID] = Field(None, description="Optional associated field plot UUID")


class EquipmentUpdate(BaseModel):
    """Payload for updating equipment details."""

    model_config = ConfigDict(protected_namespaces=())

    farm_id: Optional[UUID] = None
    field_id: Optional[UUID] = None
    equipment_name: Optional[str] = Field(None, min_length=1, max_length=150)
    equipment_type: Optional[str] = Field(None, min_length=1, max_length=60)
    brand: Optional[str] = Field(None, max_length=100)
    model_number: Optional[str] = Field(None, max_length=100)
    serial_number: Optional[str] = Field(None, max_length=100)
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = Field(None, ge=0)
    supplier_name: Optional[str] = Field(None, max_length=150)
    quantity: Optional[int] = Field(None, gt=0)
    condition: Optional[str] = None
    operational_status: Optional[str] = None
    fuel_type: Optional[str] = Field(None, max_length=50)
    identification_number: Optional[str] = Field(None, max_length=100)
    warranty_expiry_date: Optional[date] = None
    last_service_date: Optional[date] = None
    next_service_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator("equipment_name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Equipment name cannot be empty.")
            return stripped
        return v

    @field_validator("condition")
    @classmethod
    def validate_condition(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            lowered = v.strip().lower()
            if lowered not in EQUIPMENT_CONDITIONS:
                raise ValueError(f"Invalid condition '{v}'. Allowed: {', '.join(EQUIPMENT_CONDITIONS)}")
            return lowered
        return v

    @field_validator("operational_status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            lowered = v.strip().lower()
            if lowered not in OPERATIONAL_STATUSES:
                raise ValueError(f"Invalid operational status '{v}'. Allowed: {', '.join(OPERATIONAL_STATUSES)}")
            return lowered
        return v


class EquipmentStatusUpdate(BaseModel):
    """Payload for quickly updating equipment operational status and condition."""

    operational_status: str = Field(..., description="Target operational status")
    condition: Optional[str] = Field(None, description="Optional updated condition")
    notes: Optional[str] = Field(None, description="Status update note")

    @field_validator("operational_status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        lowered = v.strip().lower()
        if lowered not in OPERATIONAL_STATUSES:
            raise ValueError(f"Invalid operational status '{v}'. Allowed: {', '.join(OPERATIONAL_STATUSES)}")
        return lowered

    @field_validator("condition")
    @classmethod
    def validate_condition(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            lowered = v.strip().lower()
            if lowered not in EQUIPMENT_CONDITIONS:
                raise ValueError(f"Invalid condition '{v}'. Allowed: {', '.join(EQUIPMENT_CONDITIONS)}")
            return lowered
        return v


# =========================================================================
# Maintenance Schemas
# =========================================================================

class EquipmentMaintenanceBase(BaseModel):
    """Base maintenance record schema."""

    maintenance_type: str = Field(..., description="Type of maintenance / service")
    service_date: date = Field(..., description="Date when service was conducted")
    description: str = Field(..., min_length=1, description="Description of service/repairs conducted")
    service_provider: Optional[str] = Field(None, max_length=150, description="Mechanic, workshop, or technician")
    parts_replaced: Optional[str] = Field(None, description="List of parts replaced or serviced")
    cost: Optional[Decimal] = Field(None, ge=0, description="Cost of maintenance in INR (non-negative)")
    downtime_minutes: Optional[int] = Field(None, ge=0, description="Machinery downtime in minutes (non-negative)")
    next_service_date: Optional[date] = Field(None, description="Recommended next service date")
    notes: Optional[str] = Field(None, description="Additional technician remarks")

    @field_validator("description")
    @classmethod
    def validate_desc(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Maintenance description cannot be empty or blank.")
        return stripped

    @field_validator("maintenance_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        lowered = v.strip().lower()
        if lowered not in MAINTENANCE_TYPES:
            raise ValueError(f"Invalid maintenance type '{v}'. Allowed: {', '.join(MAINTENANCE_TYPES)}")
        return lowered


class EquipmentMaintenanceCreate(EquipmentMaintenanceBase):
    """Payload for creating a maintenance record."""

    update_equipment_status: Optional[str] = Field(
        None,
        description="Optional status to set on the equipment (e.g. 'available', 'under_maintenance')",
    )

    @field_validator("update_equipment_status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            lowered = v.strip().lower()
            if lowered not in OPERATIONAL_STATUSES:
                raise ValueError(f"Invalid operational status '{v}'. Allowed: {', '.join(OPERATIONAL_STATUSES)}")
            return lowered
        return v


class EquipmentMaintenanceUpdate(BaseModel):
    """Payload for updating a maintenance record."""

    maintenance_type: Optional[str] = None
    service_date: Optional[date] = None
    description: Optional[str] = None
    service_provider: Optional[str] = Field(None, max_length=150)
    parts_replaced: Optional[str] = None
    cost: Optional[Decimal] = Field(None, ge=0)
    downtime_minutes: Optional[int] = Field(None, ge=0)
    next_service_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator("description")
    @classmethod
    def validate_desc(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Maintenance description cannot be empty.")
            return stripped
        return v

    @field_validator("maintenance_type")
    @classmethod
    def validate_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            lowered = v.strip().lower()
            if lowered not in MAINTENANCE_TYPES:
                raise ValueError(f"Invalid maintenance type '{v}'. Allowed: {', '.join(MAINTENANCE_TYPES)}")
            return lowered
        return v


class EquipmentMaintenanceResponse(BaseModel):
    """Response DTO for equipment maintenance record."""

    id: UUID
    equipment_id: UUID
    equipment_name: Optional[str] = None
    equipment_type: Optional[str] = None
    farm_id: Optional[UUID] = None
    farm_name: Optional[str] = None
    maintenance_type: str
    maintenance_type_label: str
    service_date: date
    description: str
    service_provider: Optional[str] = None
    parts_replaced: Optional[str] = None
    cost: Optional[Decimal] = None
    downtime_minutes: Optional[int] = None
    next_service_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EquipmentResponse(BaseModel):
    """Response DTO for equipment record with relational names and summary metrics."""

    id: UUID
    farm_id: UUID
    farm_name: Optional[str] = None
    field_id: Optional[UUID] = None
    field_name: Optional[str] = None
    equipment_name: str
    equipment_type: str
    brand: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    supplier_name: Optional[str] = None
    quantity: int
    condition: str
    operational_status: str
    fuel_type: Optional[str] = None
    identification_number: Optional[str] = None
    warranty_expiry_date: Optional[date] = None
    last_service_date: Optional[date] = None
    next_service_date: Optional[date] = None
    service_status: str = "ok"  # 'overdue', 'upcoming', 'due_soon', 'ok', 'retired', 'not_scheduled'
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    maintenance_count: int = 0
    total_maintenance_cost: Decimal = Decimal("0.00")
    maintenance_records: Optional[List[EquipmentMaintenanceResponse]] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class EquipmentSummaryResponse(BaseModel):
    """Authoritative equipment dashboard summary metrics."""

    total_equipment: int = 0
    available_count: int = 0
    in_use_count: int = 0
    under_maintenance_count: int = 0
    retired_count: int = 0
    upcoming_services_count: int = 0
    overdue_services_count: int = 0
    missing_service_date_count: int = 0
    total_purchase_value: Decimal = Decimal("0.00")
    total_maintenance_cost: Decimal = Decimal("0.00")
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_condition: Dict[str, int] = Field(default_factory=dict)
    by_status: Dict[str, int] = Field(default_factory=dict)


class EquipmentDeleteResponse(BaseModel):
    """Response confirming equipment deletion."""

    id: UUID
    deleted: bool
    message: str
