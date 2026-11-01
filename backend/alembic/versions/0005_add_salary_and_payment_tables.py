"""Add salary_records and salary_payments tables

Revision ID: 0005_add_salary_and_payment_tables
Revises: 0004_add_attendance_table
Create Date: 2026-10-09 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0005_add_salary_and_payment_tables"
down_revision: Union[str, None] = "0004_add_attendance_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create salary_records table
    op.create_table(
        "salary_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("labour_id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("daily_wage_snapshot", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("present_days", sa.Numeric(precision=5, scale=2), server_default="0.00", nullable=False),
        sa.Column("half_days", sa.Integer(), server_default="0", nullable=False),
        sa.Column("absent_days", sa.Integer(), server_default="0", nullable=False),
        sa.Column("leave_days", sa.Integer(), server_default="0", nullable=False),
        sa.Column("payable_units", sa.Numeric(precision=5, scale=2), server_default="0.00", nullable=False),
        sa.Column("regular_salary", sa.Numeric(precision=12, scale=2), server_default="0.00", nullable=False),
        sa.Column("overtime_pay", sa.Numeric(precision=12, scale=2), server_default="0.00", nullable=False),
        sa.Column("additional_earnings", sa.Numeric(precision=12, scale=2), server_default="0.00", nullable=False),
        sa.Column("deductions", sa.Numeric(precision=12, scale=2), server_default="0.00", nullable=False),
        sa.Column("gross_salary", sa.Numeric(precision=12, scale=2), server_default="0.00", nullable=False),
        sa.Column("net_salary", sa.Numeric(precision=12, scale=2), server_default="0.00", nullable=False),
        sa.Column("amount_paid", sa.Numeric(precision=12, scale=2), server_default="0.00", nullable=False),
        sa.Column("outstanding_balance", sa.Numeric(precision=12, scale=2), server_default="0.00", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="generated", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("calculation_metadata", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["labour_id"], ["labour.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("labour_id", "period_start", "period_end", name="uq_salary_labour_period"),
        sa.CheckConstraint("period_end >= period_start", name="check_valid_salary_period"),
        sa.CheckConstraint("daily_wage_snapshot >= 0", name="check_positive_daily_wage_snapshot"),
        sa.CheckConstraint("regular_salary >= 0", name="check_positive_regular_salary"),
        sa.CheckConstraint("gross_salary >= 0", name="check_positive_gross_salary"),
        sa.CheckConstraint("net_salary >= 0", name="check_positive_net_salary"),
        sa.CheckConstraint("amount_paid >= 0", name="check_positive_amount_paid"),
        sa.CheckConstraint("outstanding_balance >= 0", name="check_positive_outstanding_balance"),
        sa.CheckConstraint(
            "status IN ('draft', 'generated', 'partially_paid', 'paid')",
            name="check_valid_salary_status",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_salary_records_id"), "salary_records", ["id"], unique=False)
    op.create_index(op.f("ix_salary_records_labour_id"), "salary_records", ["labour_id"], unique=False)
    op.create_index(op.f("ix_salary_records_farm_id"), "salary_records", ["farm_id"], unique=False)
    op.create_index(op.f("ix_salary_records_period_start"), "salary_records", ["period_start"], unique=False)
    op.create_index(op.f("ix_salary_records_period_end"), "salary_records", ["period_end"], unique=False)
    op.create_index(op.f("ix_salary_records_status"), "salary_records", ["status"], unique=False)

    # 2. Create salary_payments table
    op.create_table(
        "salary_payments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("salary_record_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("payment_method", sa.String(length=30), server_default="cash", nullable=False),
        sa.Column("transaction_reference", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["salary_record_id"], ["salary_records.id"], ondelete="CASCADE"),
        sa.CheckConstraint("amount > 0", name="check_positive_payment_amount"),
        sa.CheckConstraint(
            "payment_method IN ('cash', 'bank_transfer', 'upi', 'cheque', 'other')",
            name="check_valid_payment_method",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_salary_payments_id"), "salary_payments", ["id"], unique=False)
    op.create_index(op.f("ix_salary_payments_salary_record_id"), "salary_payments", ["salary_record_id"], unique=False)
    op.create_index(op.f("ix_salary_payments_payment_date"), "salary_payments", ["payment_date"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_salary_payments_payment_date"), table_name="salary_payments")
    op.drop_index(op.f("ix_salary_payments_salary_record_id"), table_name="salary_payments")
    op.drop_index(op.f("ix_salary_payments_id"), table_name="salary_payments")
    op.drop_table("salary_payments")

    op.drop_index(op.f("ix_salary_records_status"), table_name="salary_records")
    op.drop_index(op.f("ix_salary_records_period_end"), table_name="salary_records")
    op.drop_index(op.f("ix_salary_records_period_start"), table_name="salary_records")
    op.drop_index(op.f("ix_salary_records_farm_id"), table_name="salary_records")
    op.drop_index(op.f("ix_salary_records_labour_id"), table_name="salary_records")
    op.drop_index(op.f("ix_salary_records_id"), table_name="salary_records")
    op.drop_table("salary_records")
