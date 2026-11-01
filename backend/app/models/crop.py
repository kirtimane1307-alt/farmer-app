"""Crop database model definition."""

from sqlalchemy import Column, String, Numeric, Text, Date, ForeignKey, CheckConstraint
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database.base import BaseDBModel


class Crop(BaseDBModel):
    """Crop entity representing planted crop cycles within a specific field plot."""

    __tablename__ = "crops"

    field_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("fields.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(120), nullable=False)
    variety = Column(String(120), nullable=False)
    season = Column(String(60), nullable=True)
    sowing_date = Column(Date, nullable=False)
    expected_harvest_date = Column(Date, nullable=True)
    actual_harvest_date = Column(Date, nullable=True)
    status = Column(String(30), default="planned", nullable=False)
    planted_area = Column(Numeric(10, 2), nullable=True)
    planted_area_unit = Column(String(20), default="acres", nullable=False)
    seed_quantity = Column(Numeric(10, 2), nullable=True)
    seed_unit = Column(String(20), default="kg", nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('planned', 'growing', 'ready_to_harvest', 'harvested', 'failed')",
            name="check_valid_crop_status",
        ),
    )

    # Relationships
    field = relationship("Field", back_populates="crops")

    def __repr__(self) -> str:
        return f"<Crop(id={self.id}, name='{self.name}', variety='{self.variety}', status='{self.status}')>"
