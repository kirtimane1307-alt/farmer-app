"""Salary Record and Labour Payment database models."""

from sqlalchemy import (
    Column,
    String,
    Numeric,
    Integer,
    Text,
    Date,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    desc,
)
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database.base import BaseDBModel


class SalaryRecord(BaseDBModel):
    """
    Salary ledger record computed for an agricultural worker across a defined calendar period.
    Preserves historical wage snapshot, attendance units, deductions, and payment balance.
    """

    __tablename__ = "salary_records"

    labour_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("labour.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    farm_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_start = Column(Date, nullable=False, index=True)
    period_end = Column(Date, nullable=False, index=True)

    # Financial snapshots & attendance unit calculations
    daily_wage_snapshot = Column(Numeric(10, 2), nullable=False)
    present_days = Column(Numeric(5, 2), default=0.00, nullable=False)
    half_days = Column(Integer, default=0, nullable=False)
    absent_days = Column(Integer, default=0, nullable=False)
    leave_days = Column(Integer, default=0, nullable=False)
    payable_units = Column(Numeric(5, 2), default=0.00, nullable=False)

    # Earnings & Deductions
    regular_salary = Column(Numeric(12, 2), default=0.00, nullable=False)
    overtime_pay = Column(Numeric(12, 2), default=0.00, nullable=False)
    additional_earnings = Column(Numeric(12, 2), default=0.00, nullable=False)
    deductions = Column(Numeric(12, 2), default=0.00, nullable=False)

    # Net ledger totals
    gross_salary = Column(Numeric(12, 2), default=0.00, nullable=False)
    net_salary = Column(Numeric(12, 2), default=0.00, nullable=False)
    amount_paid = Column(Numeric(12, 2), default=0.00, nullable=False)
    outstanding_balance = Column(Numeric(12, 2), default=0.00, nullable=False)

    status = Column(String(20), default="generated", nullable=False, index=True)
    notes = Column(Text, nullable=True)
    calculation_metadata = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "labour_id",
            "period_start",
            "period_end",
            name="uq_salary_labour_period",
        ),
        CheckConstraint("period_end >= period_start", name="check_valid_salary_period"),
        CheckConstraint("daily_wage_snapshot >= 0", name="check_positive_daily_wage_snapshot"),
        CheckConstraint("regular_salary >= 0", name="check_positive_regular_salary"),
        CheckConstraint("gross_salary >= 0", name="check_positive_gross_salary"),
        CheckConstraint("net_salary >= 0", name="check_positive_net_salary"),
        CheckConstraint("amount_paid >= 0", name="check_positive_amount_paid"),
        CheckConstraint("outstanding_balance >= 0", name="check_positive_outstanding_balance"),
        CheckConstraint(
            "status IN ('draft', 'generated', 'partially_paid', 'paid')",
            name="check_valid_salary_status",
        ),
    )

    # Relationships
    labour = relationship("Labour", back_populates="salaries")
    farm = relationship("Farm")
    payments = relationship(
        "SalaryPayment",
        back_populates="salary_record",
        cascade="all, delete-orphan",
        order_by=lambda: desc(SalaryPayment.payment_date),
    )

    def __repr__(self) -> str:
        return (
            f"<SalaryRecord(id={self.id}, labour_id={self.labour_id}, "
            f"period='{self.period_start} to {self.period_end}', "
            f"net={self.net_salary}, paid={self.amount_paid}, status='{self.status}')>"
        )


class SalaryPayment(BaseDBModel):
    """
    Individual disbursement or wage installment paid towards a specific SalaryRecord.
    Maintains payment audit trail, payment method, and transaction references.
    """

    __tablename__ = "salary_payments"

    salary_record_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("salary_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount = Column(Numeric(12, 2), nullable=False)
    payment_date = Column(Date, nullable=False, index=True)
    payment_method = Column(String(30), default="cash", nullable=False)
    transaction_reference = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("amount > 0", name="check_positive_payment_amount"),
        CheckConstraint(
            "payment_method IN ('cash', 'bank_transfer', 'upi', 'cheque', 'other')",
            name="check_valid_payment_method",
        ),
    )

    # Relationships
    salary_record = relationship("SalaryRecord", back_populates="payments")

    def __repr__(self) -> str:
        return (
            f"<SalaryPayment(id={self.id}, salary_record_id={self.salary_record_id}, "
            f"amount={self.amount}, date='{self.payment_date}', method='{self.payment_method}')>"
        )
