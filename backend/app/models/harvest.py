"""Harvest database model definition."""

from datetime import date
from decimal import Decimal
from uuid import uuid4
from sqlalchemy import Column, String, Numeric, Text, Date, ForeignKey, CheckConstraint, Index
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database.base import BaseDBModel


# Predefined quantity units and quality grades
HARVEST_UNITS = [
    "kg",
    "quintals",
    "tonnes",
    "grams",
    "bags",
    "crates",
    "pieces",
    "other",
]

QUALITY_GRADES = [
    "Grade A",
    "Grade B",
    "Grade C",
    "Standard",
    "Rejected",
    "Not specified",
]

HARVEST_METHODS = [
    "Manual",
    "Machine",
    "Combined",
    "Other",
]


class Harvest(BaseDBModel):
    """Harvest entity recording crop yield output, quantity, measurement unit, and quality grade."""

    __tablename__ = "harvests"

    farm_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    field_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("fields.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    crop_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("crops.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    harvest_date = Column(Date, nullable=False, index=True)
    quantity = Column(Numeric(12, 2), nullable=False)
    unit = Column(String(30), nullable=False, default="kg")
    quality_grade = Column(String(30), nullable=True, default="Standard")
    harvest_method = Column(String(60), nullable=True)
    storage_location = Column(String(150), nullable=True)
    batch_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("quantity > 0", name="check_positive_harvest_quantity"),
        Index("ix_harvests_farm_date", "farm_id", "harvest_date"),
        Index("ix_harvests_field_date", "field_id", "harvest_date"),
        Index("ix_harvests_crop_date", "crop_id", "harvest_date"),
    )

    # Relationships
    farm = relationship("Farm")
    field = relationship("Field")
    crop = relationship("Crop")

    def __repr__(self) -> str:
        return (
            f"<Harvest(id={self.id}, crop_id={self.crop_id}, "
            f"quantity={self.quantity} {self.unit}, date={self.harvest_date})>"
        )
