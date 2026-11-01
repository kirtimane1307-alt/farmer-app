"""Field/Plot database model definition."""

from sqlalchemy import Column, String, Numeric, Text, ForeignKey, CheckConstraint
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database.base import BaseDBModel


class Field(BaseDBModel):
    """Field/Plot entity representing a subdivided section of a farm for crop cultivation."""

    __tablename__ = "fields"

    farm_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(120), nullable=False)
    area = Column(Numeric(10, 2), nullable=False)
    area_unit = Column(String(20), default="acres", nullable=False)
    soil_type = Column(String(60), nullable=True)
    irrigation_type = Column(String(60), nullable=True)
    description = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("area > 0", name="check_positive_field_area"),
    )

    # Relationships
    farm = relationship("Farm", back_populates="fields")
    crops = relationship(
        "Crop",
        back_populates="field",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Field(id={self.id}, name='{self.name}', area={self.area} {self.area_unit})>"
