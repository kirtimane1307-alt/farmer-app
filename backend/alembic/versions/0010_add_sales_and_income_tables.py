"""Add sales, sale_payments, and other_incomes tables for Phase 15: Sales, Income & Profit/Loss Management

Revision ID: 0010_add_sales_and_income_tables
Revises: 0009_add_harvests_table
Create Date: 2026-10-19 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0010_add_sales_and_income_tables"
down_revision: Union[str, None] = "0009_add_harvests_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create sales table
    op.create_table(
        "sales",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=False),
        sa.Column("field_id", sa.Uuid(), nullable=True),
        sa.Column("crop_id", sa.Uuid(), nullable=True),
        sa.Column("harvest_id", sa.Uuid(), nullable=True),
        sa.Column("created_by_id", sa.Uuid(), nullable=True),
        sa.Column("sale_number", sa.String(length=60), nullable=False),
        sa.Column("sale_date", sa.Date(), nullable=False),
        sa.Column("buyer_name", sa.String(length=150), nullable=False),
        sa.Column("buyer_phone", sa.String(length=50), nullable=True),
        sa.Column("buyer_address", sa.String(length=255), nullable=True),
        sa.Column("product_name", sa.String(length=150), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("unit", sa.String(length=30), server_default="kg", nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("gross_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("discount_amount", sa.Numeric(precision=12, scale=2), server_default="0.00", nullable=False),
        sa.Column("total_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("amount_paid", sa.Numeric(precision=12, scale=2), server_default="0.00", nullable=False),
        sa.Column("outstanding_amount", sa.Numeric(precision=12, scale=2), server_default="0.00", nullable=False),
        sa.Column("payment_status", sa.String(length=30), server_default="unpaid", nullable=False),
        sa.Column("payment_method", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("quantity > 0", name="check_positive_sale_quantity"),
        sa.CheckConstraint("unit_price >= 0", name="check_non_negative_unit_price"),
        sa.CheckConstraint("gross_amount >= 0", name="check_non_negative_gross_amount"),
        sa.CheckConstraint("discount_amount >= 0", name="check_non_negative_discount"),
        sa.CheckConstraint("discount_amount <= gross_amount", name="check_discount_not_exceed_gross"),
        sa.CheckConstraint("total_amount >= 0", name="check_non_negative_total_amount"),
        sa.CheckConstraint("amount_paid >= 0", name="check_non_negative_sale_amount_paid"),
        sa.CheckConstraint("outstanding_amount >= 0", name="check_non_negative_outstanding_amount"),
        sa.CheckConstraint("payment_status IN ('unpaid', 'partially_paid', 'paid')", name="check_valid_sale_payment_status"),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["field_id"], ["fields.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["crop_id"], ["crops.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["harvest_id"], ["harvests.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sale_number"),
    )

    op.create_index(op.f("ix_sales_id"), "sales", ["id"], unique=False)
    op.create_index(op.f("ix_sales_farm_id"), "sales", ["farm_id"], unique=False)
    op.create_index(op.f("ix_sales_field_id"), "sales", ["field_id"], unique=False)
    op.create_index(op.f("ix_sales_crop_id"), "sales", ["crop_id"], unique=False)
    op.create_index(op.f("ix_sales_harvest_id"), "sales", ["harvest_id"], unique=False)
    op.create_index(op.f("ix_sales_created_by_id"), "sales", ["created_by_id"], unique=False)
    op.create_index(op.f("ix_sales_sale_number"), "sales", ["sale_number"], unique=True)
    op.create_index(op.f("ix_sales_sale_date"), "sales", ["sale_date"], unique=False)
    op.create_index(op.f("ix_sales_buyer_name"), "sales", ["buyer_name"], unique=False)
    op.create_index(op.f("ix_sales_payment_status"), "sales", ["payment_status"], unique=False)
    op.create_index("ix_sales_farm_date", "sales", ["farm_id", "sale_date"], unique=False)
    op.create_index("ix_sales_crop_date", "sales", ["crop_id", "sale_date"], unique=False)

    # 2. Create sale_payments table
    op.create_table(
        "sale_payments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sale_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("payment_method", sa.String(length=50), server_default="cash", nullable=False),
        sa.Column("reference_number", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("amount > 0", name="check_positive_sale_payment_amount"),
        sa.CheckConstraint("payment_method IN ('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other')", name="check_valid_sale_payment_method"),
        sa.ForeignKeyConstraint(["sale_id"], ["sales.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(op.f("ix_sale_payments_id"), "sale_payments", ["id"], unique=False)
    op.create_index(op.f("ix_sale_payments_sale_id"), "sale_payments", ["sale_id"], unique=False)
    op.create_index(op.f("ix_sale_payments_payment_date"), "sale_payments", ["payment_date"], unique=False)

    # 3. Create other_incomes table
    op.create_table(
        "other_incomes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_id", sa.Uuid(), nullable=True),
        sa.Column("income_date", sa.Date(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("source", sa.String(length=150), nullable=True),
        sa.Column("payment_method", sa.String(length=50), server_default="cash", nullable=True),
        sa.Column("reference_number", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("amount > 0", name="check_positive_other_income_amount"),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(op.f("ix_other_incomes_id"), "other_incomes", ["id"], unique=False)
    op.create_index(op.f("ix_other_incomes_farm_id"), "other_incomes", ["farm_id"], unique=False)
    op.create_index(op.f("ix_other_incomes_created_by_id"), "other_incomes", ["created_by_id"], unique=False)
    op.create_index(op.f("ix_other_incomes_income_date"), "other_incomes", ["income_date"], unique=False)
    op.create_index(op.f("ix_other_incomes_category"), "other_incomes", ["category"], unique=False)
    op.create_index("ix_other_incomes_farm_date", "other_incomes", ["farm_id", "income_date"], unique=False)


def downgrade() -> None:
    # 1. Drop other_incomes
    op.drop_index("ix_other_incomes_farm_date", table_name="other_incomes")
    op.drop_index(op.f("ix_other_incomes_category"), table_name="other_incomes")
    op.drop_index(op.f("ix_other_incomes_income_date"), table_name="other_incomes")
    op.drop_index(op.f("ix_other_incomes_created_by_id"), table_name="other_incomes")
    op.drop_index(op.f("ix_other_incomes_farm_id"), table_name="other_incomes")
    op.drop_index(op.f("ix_other_incomes_id"), table_name="other_incomes")
    op.drop_table("other_incomes")

    # 2. Drop sale_payments
    op.drop_index(op.f("ix_sale_payments_payment_date"), table_name="sale_payments")
    op.drop_index(op.f("ix_sale_payments_sale_id"), table_name="sale_payments")
    op.drop_index(op.f("ix_sale_payments_id"), table_name="sale_payments")
    op.drop_table("sale_payments")

    # 3. Drop sales
    op.drop_index("ix_sales_crop_date", table_name="sales")
    op.drop_index("ix_sales_farm_date", table_name="sales")
    op.drop_index(op.f("ix_sales_payment_status"), table_name="sales")
    op.drop_index(op.f("ix_sales_buyer_name"), table_name="sales")
    op.drop_index(op.f("ix_sales_sale_date"), table_name="sales")
    op.drop_index(op.f("ix_sales_sale_number"), table_name="sales")
    op.drop_index(op.f("ix_sales_created_by_id"), table_name="sales")
    op.drop_index(op.f("ix_sales_harvest_id"), table_name="sales")
    op.drop_index(op.f("ix_sales_crop_id"), table_name="sales")
    op.drop_index(op.f("ix_sales_field_id"), table_name="sales")
    op.drop_index(op.f("ix_sales_farm_id"), table_name="sales")
    op.drop_index(op.f("ix_sales_id"), table_name="sales")
    op.drop_table("sales")
