"""Farm Expense database models for Phase 12: Expense Management."""

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
    desc,
)
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database.base import BaseDBModel


# Supported expense categories constant
EXPENSE_CATEGORIES = [
    "labour",
    "fertilizer",
    "pesticide",
    "seeds",
    "irrigation",
    "fuel",
    "equipment",
    "maintenance_and_repairs",
    "transportation",
    "electricity",
    "water",
    "rent_and_leasing",
    "other",
]

# Display mapping for frontend and reports
EXPENSE_CATEGORY_LABELS = {
    "labour": "Labour",
    "fertilizer": "Fertilizer",
    "pesticide": "Pesticide",
    "seeds": "Seeds",
    "irrigation": "Irrigation",
    "fuel": "Fuel",
    "equipment": "Equipment",
    "maintenance_and_repairs": "Maintenance and Repairs",
    "transportation": "Transportation",
    "electricity": "Electricity",
    "water": "Water",
    "rent_and_leasing": "Rent and Leasing",
    "other": "Other",
}


class Expense(BaseDBModel):
    """
    Expense entity recording farm operational costs.
    Supports allocation to a farm estate, and optionally to specific field plots or crop cycles.
    Tracks financial amounts, payment status, vendors, and audit details.
    """

    __tablename__ = "expenses"

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
    crop_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("crops.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    category = Column(String(50), nullable=False, index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)

    amount = Column(Numeric(12, 2), nullable=False)
    amount_paid = Column(Numeric(12, 2), server_default="0.00", nullable=False)
    outstanding_balance = Column(Numeric(12, 2), server_default="0.00", nullable=False)

    expense_date = Column(Date, nullable=False, index=True)
    payment_status = Column(String(30), server_default="unpaid", nullable=False, index=True)
    payment_method = Column(String(50), nullable=True)

    vendor_name = Column(String(150), nullable=True, index=True)
    invoice_number = Column(String(100), nullable=True, index=True)
    transaction_reference = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("amount > 0", name="check_positive_expense_amount"),
        CheckConstraint("amount_paid >= 0", name="check_non_negative_amount_paid"),
        CheckConstraint(
            "outstanding_balance >= 0",
            name="check_non_negative_outstanding_balance",
        ),
        CheckConstraint(
            "payment_status IN ('unpaid', 'partially_paid', 'paid')",
            name="check_valid_payment_status",
        ),
        CheckConstraint(
            "category IN ("
            "'labour', 'fertilizer', 'pesticide', 'seeds', 'irrigation', "
            "'fuel', 'equipment', 'maintenance_and_repairs', 'transportation', "
            "'electricity', 'water', 'rent_and_leasing', 'other')",
            name="check_valid_expense_category",
        ),
    )

    # Relationships
    farm = relationship("Farm")
    field = relationship("Field")
    crop = relationship("Crop")
    created_by = relationship("User")
    payments = relationship(
        "ExpensePayment",
        back_populates="expense",
        cascade="all, delete-orphan",
        order_by=lambda: desc(ExpensePayment.payment_date),
    )

    def __repr__(self) -> str:
        return (
            f"<Expense(id={self.id}, title='{self.title}', category='{self.category}', "
            f"amount={self.amount}, status='{self.payment_status}', date='{self.expense_date}')>"
        )


class ExpensePayment(BaseDBModel):
    """
    Payment transaction record for an expense disbursement or installment.
    Maintains payment audit trail, date, method, and transaction references.
    """

    __tablename__ = "expense_payments"

    expense_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("expenses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount = Column(Numeric(12, 2), nullable=False)
    payment_date = Column(Date, nullable=False, index=True)
    payment_method = Column(String(50), server_default="cash", nullable=False)
    transaction_reference = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("amount > 0", name="check_positive_expense_payment_amount"),
        CheckConstraint(
            "payment_method IN ('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other')",
            name="check_valid_expense_payment_method",
        ),
    )

    # Relationships
    expense = relationship("Expense", back_populates="payments")

    def __repr__(self) -> str:
        return (
            f"<ExpensePayment(id={self.id}, expense_id={self.expense_id}, "
            f"amount={self.amount}, date='{self.payment_date}', method='{self.payment_method}')>"
        )
