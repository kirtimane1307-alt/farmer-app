"""Add expenses and expense_payments tables

Revision ID: 0007_add_expenses_and_payments_tables
Revises: 0006_add_agricultural_applications_table
Create Date: 2026-10-19 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0007_add_expenses_and_payments_tables"
down_revision: Union[str, None] = "0006_add_agricultural_applications_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create expenses table
    op.create_table(
        "expenses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=False),
        sa.Column("field_id", sa.Uuid(), nullable=True),
        sa.Column("crop_id", sa.Uuid(), nullable=True),
        sa.Column("created_by_id", sa.Uuid(), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("amount_paid", sa.Numeric(precision=12, scale=2), server_default="0.00", nullable=False),
        sa.Column("outstanding_balance", sa.Numeric(precision=12, scale=2), server_default="0.00", nullable=False),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("payment_status", sa.String(length=30), server_default="unpaid", nullable=False),
        sa.Column("payment_method", sa.String(length=50), nullable=True),
        sa.Column("vendor_name", sa.String(length=150), nullable=True),
        sa.Column("invoice_number", sa.String(length=100), nullable=True),
        sa.Column("transaction_reference", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["field_id"], ["fields.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["crop_id"], ["crops.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.CheckConstraint("amount > 0", name="check_positive_expense_amount"),
        sa.CheckConstraint("amount_paid >= 0", name="check_non_negative_amount_paid"),
        sa.CheckConstraint("outstanding_balance >= 0", name="check_non_negative_outstanding_balance"),
        sa.CheckConstraint(
            "payment_status IN ('unpaid', 'partially_paid', 'paid')",
            name="check_valid_payment_status",
        ),
        sa.CheckConstraint(
            "category IN ("
            "'labour', 'fertilizer', 'pesticide', 'seeds', 'irrigation', "
            "'fuel', 'equipment', 'maintenance_and_repairs', 'transportation', "
            "'electricity', 'water', 'rent_and_leasing', 'other')",
            name="check_valid_expense_category",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_expenses_id", "expenses", ["id"])
    op.create_index("ix_expenses_farm_id", "expenses", ["farm_id"])
    op.create_index("ix_expenses_field_id", "expenses", ["field_id"])
    op.create_index("ix_expenses_crop_id", "expenses", ["crop_id"])
    op.create_index("ix_expenses_created_by_id", "expenses", ["created_by_id"])
    op.create_index("ix_expenses_category", "expenses", ["category"])
    op.create_index("ix_expenses_title", "expenses", ["title"])
    op.create_index("ix_expenses_expense_date", "expenses", ["expense_date"])
    op.create_index("ix_expenses_payment_status", "expenses", ["payment_status"])
    op.create_index("ix_expenses_vendor_name", "expenses", ["vendor_name"])
    op.create_index("ix_expenses_invoice_number", "expenses", ["invoice_number"])

    # 2. Create expense_payments table
    op.create_table(
        "expense_payments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("expense_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("payment_method", sa.String(length=50), server_default="cash", nullable=False),
        sa.Column("transaction_reference", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["expense_id"], ["expenses.id"], ondelete="CASCADE"),
        sa.CheckConstraint("amount > 0", name="check_positive_expense_payment_amount"),
        sa.CheckConstraint(
            "payment_method IN ('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other')",
            name="check_valid_expense_payment_method",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_expense_payments_id", "expense_payments", ["id"])
    op.create_index("ix_expense_payments_expense_id", "expense_payments", ["expense_id"])
    op.create_index("ix_expense_payments_payment_date", "expense_payments", ["payment_date"])


def downgrade() -> None:
    op.drop_index("ix_expense_payments_payment_date", table_name="expense_payments")
    op.drop_index("ix_expense_payments_expense_id", table_name="expense_payments")
    op.drop_index("ix_expense_payments_id", table_name="expense_payments")
    op.drop_table("expense_payments")

    op.drop_index("ix_expenses_invoice_number", table_name="expenses")
    op.drop_index("ix_expenses_vendor_name", table_name="expenses")
    op.drop_index("ix_expenses_payment_status", table_name="expenses")
    op.drop_index("ix_expenses_expense_date", table_name="expenses")
    op.drop_index("ix_expenses_title", table_name="expenses")
    op.drop_index("ix_expenses_category", table_name="expenses")
    op.drop_index("ix_expenses_created_by_id", table_name="expenses")
    op.drop_index("ix_expenses_crop_id", table_name="expenses")
    op.drop_index("ix_expenses_field_id", table_name="expenses")
    op.drop_index("ix_expenses_farm_id", table_name="expenses")
    op.drop_index("ix_expenses_id", table_name="expenses")
    op.drop_table("expenses")
