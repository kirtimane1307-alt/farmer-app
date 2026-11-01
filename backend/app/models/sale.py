"""Farm Produce Sales and Sales Payment database models for Phase 15."""

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
    desc,
)
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database.base import BaseDBModel


# Supported payment status & methods
SALE_PAYMENT_STATUSES = ["unpaid", "partially_paid", "paid"]

SALE_PAYMENT_METHODS = [
    "cash",
    "bank_transfer",
    "upi",
    "cheque",
    "card",
    "other",
]

SALE_PAYMENT_METHOD_LABELS = {
    "cash": "Cash",
    "bank_transfer": "Bank Transfer (NEFT/RTGS/IMPS)",
    "upi": "UPI / QR Code",
    "cheque": "Cheque",
    "card": "Debit / Credit Card",
    "other": "Other Payment Method",
}


class Sale(BaseDBModel):
    """
    Produce Sale entity recording revenue from harvested crops sold to buyers,
    mandis, wholesalers, or direct consumers.
    Links to farms, and optionally to specific fields, crops, and harvests.
    """

    __tablename__ = "sales"

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
    harvest_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("harvests.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    sale_number = Column(String(60), unique=True, nullable=False, index=True)
    sale_date = Column(Date, nullable=False, index=True)

    # Buyer information
    buyer_name = Column(String(150), nullable=False, index=True)
    buyer_phone = Column(String(50), nullable=True)
    buyer_address = Column(String(255), nullable=True)

    # Product details
    product_name = Column(String(150), nullable=False)
    quantity = Column(Numeric(12, 2), nullable=False)
    unit = Column(String(30), server_default="kg", nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)

    # Financial breakdown
    gross_amount = Column(Numeric(12, 2), nullable=False)
    discount_amount = Column(Numeric(12, 2), server_default="0.00", nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    amount_paid = Column(Numeric(12, 2), server_default="0.00", nullable=False)
    outstanding_amount = Column(Numeric(12, 2), server_default="0.00", nullable=False)

    payment_status = Column(
        String(30), server_default="unpaid", nullable=False, index=True
    )
    payment_method = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("quantity > 0", name="check_positive_sale_quantity"),
        CheckConstraint("unit_price >= 0", name="check_non_negative_unit_price"),
        CheckConstraint("gross_amount >= 0", name="check_non_negative_gross_amount"),
        CheckConstraint("discount_amount >= 0", name="check_non_negative_discount"),
        CheckConstraint(
            "discount_amount <= gross_amount",
            name="check_discount_not_exceed_gross",
        ),
        CheckConstraint("total_amount >= 0", name="check_non_negative_total_amount"),
        CheckConstraint("amount_paid >= 0", name="check_non_negative_sale_amount_paid"),
        CheckConstraint(
            "outstanding_amount >= 0", name="check_non_negative_outstanding_amount"
        ),
        CheckConstraint(
            "payment_status IN ('unpaid', 'partially_paid', 'paid')",
            name="check_valid_sale_payment_status",
        ),
        Index("ix_sales_farm_date", "farm_id", "sale_date"),
        Index("ix_sales_crop_date", "crop_id", "sale_date"),
    )

    # Relationships
    farm = relationship("Farm")
    field = relationship("Field")
    crop = relationship("Crop")
    harvest = relationship("Harvest")
    created_by = relationship("User")
    payments = relationship(
        "SalePayment",
        back_populates="sale",
        cascade="all, delete-orphan",
        order_by=lambda: desc(SalePayment.payment_date),
    )

    def __repr__(self) -> str:
        return (
            f"<Sale(id={self.id}, number='{self.sale_number}', buyer='{self.buyer_name}', "
            f"product='{self.product_name}', total={self.total_amount}, status='{self.payment_status}')>"
        )


class SalePayment(BaseDBModel):
    """
    Payment transaction record for a produce sale installment or full settlement.
    Maintains payment audit trail, date, amount, method, and references.
    """

    __tablename__ = "sale_payments"

    sale_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount = Column(Numeric(12, 2), nullable=False)
    payment_date = Column(Date, nullable=False, index=True)
    payment_method = Column(String(50), server_default="cash", nullable=False)
    reference_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("amount > 0", name="check_positive_sale_payment_amount"),
        CheckConstraint(
            "payment_method IN ('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other')",
            name="check_valid_sale_payment_method",
        ),
    )

    # Relationships
    sale = relationship("Sale", back_populates="payments")

    def __repr__(self) -> str:
        return (
            f"<SalePayment(id={self.id}, sale_id={self.sale_id}, "
            f"amount={self.amount}, date='{self.payment_date}', method='{self.payment_method}')>"
        )
