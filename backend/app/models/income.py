"""Other Farm Income database model for Phase 15."""

from datetime import date
from decimal import Decimal
from sqlalchemy import (
    Column,
    String,
    Numeric,
    Text,
    Date,
    ForeignKey,
    CheckConstraint,
    Index,
)
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database.base import BaseDBModel


# Suggested and standard income categories
INCOME_CATEGORIES = [
    "government_subsidy",
    "insurance_compensation",
    "equipment_rental",
    "land_lease",
    "scrap_byproduct",
    "agro_tourism",
    "consulting",
    "miscellaneous",
    "other",
]

INCOME_CATEGORY_LABELS = {
    "government_subsidy": "Government Subsidy",
    "insurance_compensation": "Insurance Compensation",
    "equipment_rental": "Equipment Rental Income",
    "land_lease": "Land Lease / Subletting",
    "scrap_byproduct": "Scrap & By-product Sales",
    "agro_tourism": "Agro-Tourism & Farm Visits",
    "consulting": "Agricultural Consulting & Training",
    "miscellaneous": "Miscellaneous Income",
    "other": "Other Agricultural Income",
}


class OtherIncome(BaseDBModel):
    """
    Other Farm Income entity recording revenue sources not directly represented
    by harvested crop sales (e.g. government subsidies, equipment rental, insurance claims).
    Keeps non-produce income strictly separated from produce sales to prevent double counting.
    """

    __tablename__ = "other_incomes"

    farm_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    income_date = Column(Date, nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)
    description = Column(String(255), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)

    source = Column(String(150), nullable=True)  # Payer / Department / Agency / Client
    payment_method = Column(String(50), server_default="cash", nullable=True)
    reference_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("amount > 0", name="check_positive_other_income_amount"),
        Index("ix_other_incomes_farm_date", "farm_id", "income_date"),
    )

    # Relationships
    farm = relationship("Farm")
    created_by = relationship("User")

    def __repr__(self) -> str:
        return (
            f"<OtherIncome(id={self.id}, farm_id={self.farm_id}, category='{self.category}', "
            f"amount={self.amount}, date='{self.income_date}')>"
        )
