"""Equipment and Machinery database models for Phase 13: Equipment & Machinery Management."""

from datetime import date
from decimal import Decimal
from sqlalchemy import (
    Column,
    String,
    Numeric,
    Integer,
    Text,
    Date,
    ForeignKey,
    CheckConstraint,
    desc,
)
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database.base import BaseDBModel

# Predefined equipment types
EQUIPMENT_TYPES = [
    "Tractor",
    "Cultivator",
    "Plough",
    "Harvester",
    "Seed Drill",
    "Sprayer",
    "Water Pump",
    "Drip Irrigation Equipment",
    "Sprinkler System",
    "Power Tiller",
    "Trailer",
    "Other",
]

# Supported equipment conditions
EQUIPMENT_CONDITIONS = [
    "excellent",
    "good",
    "fair",
    "poor",
    "damaged",
]

# Supported operational statuses
OPERATIONAL_STATUSES = [
    "available",
    "in_use",
    "under_maintenance",
    "retired",
]

# Supported maintenance types
MAINTENANCE_TYPES = [
    "routine_service",
    "preventive_maintenance",
    "repair",
    "inspection",
    "parts_replacement",
    "other",
]

# Display mapping for maintenance types
MAINTENANCE_TYPE_LABELS = {
    "routine_service": "Routine Service",
    "preventive_maintenance": "Preventive Maintenance",
    "repair": "Repair",
    "inspection": "Inspection",
    "parts_replacement": "Parts Replacement",
    "other": "Other",
}


class Equipment(BaseDBModel):
    """
    Equipment entity representing agricultural machinery, implements, or tools.
    Belongs strictly to a Farm estate owned by an authenticated user.
    Optionally associated with a specific Field plot.
    """

    __tablename__ = "equipment"

    farm_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    field_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("fields.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    equipment_name = Column(String(150), nullable=False, index=True)
    equipment_type = Column(String(60), nullable=False, index=True)
    brand = Column(String(100), nullable=True)
    model_number = Column(String(100), nullable=True)
    serial_number = Column(String(100), nullable=True, index=True)

    # Purchase & Financial Information
    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(Numeric(12, 2), nullable=True)
    supplier_name = Column(String(150), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)

    # Operational & Condition Tracking
    condition = Column(String(30), default="good", nullable=False, index=True)
    operational_status = Column(String(30), default="available", nullable=False, index=True)
    fuel_type = Column(String(50), nullable=True)
    identification_number = Column(String(100), nullable=True)  # license plate, registration tag

    # Service & Maintenance Schedules
    warranty_expiry_date = Column(Date, nullable=True)
    last_service_date = Column(Date, nullable=True)
    next_service_date = Column(Date, nullable=True, index=True)

    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "purchase_price IS NULL OR purchase_price >= 0",
            name="check_non_negative_purchase_price",
        ),
        CheckConstraint("quantity > 0", name="check_positive_equipment_quantity"),
        CheckConstraint(
            "condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')",
            name="check_valid_equipment_condition",
        ),
        CheckConstraint(
            "operational_status IN ('available', 'in_use', 'under_maintenance', 'retired')",
            name="check_valid_operational_status",
        ),
    )

    # Relationships
    farm = relationship("Farm", foreign_keys=[farm_id], lazy="joined")
    field = relationship("Field", foreign_keys=[field_id], lazy="joined")
    maintenance_records = relationship(
        "EquipmentMaintenance",
        back_populates="equipment",
        cascade="all, delete-orphan",
        order_by="desc(EquipmentMaintenance.service_date)",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<Equipment(id={self.id}, name='{self.equipment_name}', "
            f"type='{self.equipment_type}', status='{self.operational_status}')>"
        )


class EquipmentMaintenance(BaseDBModel):
    """
    Equipment Maintenance entity recording servicing, repairs, and inspections
    conducted on a specific piece of machinery.
    """

    __tablename__ = "equipment_maintenance"

    equipment_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("equipment.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    maintenance_type = Column(String(50), nullable=False, index=True)
    service_date = Column(Date, nullable=False, index=True)
    description = Column(Text, nullable=False)
    service_provider = Column(String(150), nullable=True)
    parts_replaced = Column(Text, nullable=True)
    cost = Column(Numeric(12, 2), nullable=True)
    downtime_minutes = Column(Integer, nullable=True)
    next_service_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("cost IS NULL OR cost >= 0", name="check_non_negative_maintenance_cost"),
        CheckConstraint(
            "downtime_minutes IS NULL OR downtime_minutes >= 0",
            name="check_non_negative_downtime_minutes",
        ),
        CheckConstraint(
            "maintenance_type IN ("
            "'routine_service', 'preventive_maintenance', 'repair', "
            "'inspection', 'parts_replacement', 'other')",
            name="check_valid_maintenance_type",
        ),
    )

    # Relationships
    equipment = relationship("Equipment", back_populates="maintenance_records")

    def __repr__(self) -> str:
        return (
            f"<EquipmentMaintenance(id={self.id}, equipment_id={self.equipment_id}, "
            f"type='{self.maintenance_type}', date='{self.service_date}')>"
        )
