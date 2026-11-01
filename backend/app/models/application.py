"""Agricultural Application database model for fertilizer and pesticide tracking."""

from sqlalchemy import (
    Column,
    String,
    Numeric,
    Text,
    Date,
    ForeignKey,
    CheckConstraint,
    desc,
)
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database.base import BaseDBModel


class AgriculturalApplication(BaseDBModel):
    """
    Agricultural Application entity tracking fertilizer and pesticide usages on farms, fields, and crops.
    Preserves exact dosages, unit metrics, target purpose, and financial expenditures.
    """

    __tablename__ = "agricultural_applications"

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
        ForeignKey("crops.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    application_category = Column(String(30), nullable=False, index=True)
    product_name = Column(String(150), nullable=False, index=True)
    product_type = Column(String(60), nullable=False, index=True)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit = Column(String(30), nullable=False)

    unit_cost = Column(Numeric(10, 2), nullable=True)
    total_cost = Column(Numeric(12, 2), nullable=True)

    application_date = Column(Date, nullable=False, index=True)
    application_method = Column(String(60), nullable=True)
    purpose = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "application_category IN ('fertilizer', 'pesticide')",
            name="check_valid_application_category",
        ),
        CheckConstraint("quantity > 0", name="check_positive_application_quantity"),
        CheckConstraint(
            "unit_cost IS NULL OR unit_cost >= 0",
            name="check_non_negative_unit_cost",
        ),
        CheckConstraint(
            "total_cost IS NULL OR total_cost >= 0",
            name="check_non_negative_total_cost",
        ),
    )

    # Relationships
    farm = relationship("Farm")
    field = relationship("Field")
    crop = relationship("Crop")

    def __repr__(self) -> str:
        return (
            f"<AgriculturalApplication(id={self.id}, category='{self.application_category}', "
            f"product='{self.product_name}', quantity={self.quantity} {self.unit}, "
            f"date='{self.application_date}')>"
        )
