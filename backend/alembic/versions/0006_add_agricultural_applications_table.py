"""Add agricultural_applications table

Revision ID: 0006_add_agricultural_applications_table
Revises: 0005_add_salary_and_payment_tables
Create Date: 2026-10-09 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0006_add_agricultural_applications_table"
down_revision: Union[str, None] = "0005_add_salary_and_payment_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agricultural_applications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=False),
        sa.Column("field_id", sa.Uuid(), nullable=False),
        sa.Column("crop_id", sa.Uuid(), nullable=True),
        sa.Column("application_category", sa.String(length=30), nullable=False),
        sa.Column("product_name", sa.String(length=150), nullable=False),
        sa.Column("product_type", sa.String(length=60), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("unit", sa.String(length=30), nullable=False),
        sa.Column("unit_cost", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("total_cost", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("application_date", sa.Date(), nullable=False),
        sa.Column("application_method", sa.String(length=60), nullable=True),
        sa.Column("purpose", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["field_id"], ["fields.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["crop_id"], ["crops.id"], ondelete="SET NULL"),
        sa.CheckConstraint(
            "application_category IN ('fertilizer', 'pesticide')",
            name="check_valid_application_category",
        ),
        sa.CheckConstraint("quantity > 0", name="check_positive_application_quantity"),
        sa.CheckConstraint(
            "unit_cost IS NULL OR unit_cost >= 0",
            name="check_non_negative_unit_cost",
        ),
        sa.CheckConstraint(
            "total_cost IS NULL OR total_cost >= 0",
            name="check_non_negative_total_cost",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agricultural_applications_farm_id", "agricultural_applications", ["farm_id"])
    op.create_index("ix_agricultural_applications_field_id", "agricultural_applications", ["field_id"])
    op.create_index("ix_agricultural_applications_crop_id", "agricultural_applications", ["crop_id"])
    op.create_index("ix_agricultural_applications_category", "agricultural_applications", ["application_category"])
    op.create_index("ix_agricultural_applications_product_name", "agricultural_applications", ["product_name"])
    op.create_index("ix_agricultural_applications_product_type", "agricultural_applications", ["product_type"])
    op.create_index("ix_agricultural_applications_date", "agricultural_applications", ["application_date"])


def downgrade() -> None:
    op.drop_index("ix_agricultural_applications_date", table_name="agricultural_applications")
    op.drop_index("ix_agricultural_applications_product_type", table_name="agricultural_applications")
    op.drop_index("ix_agricultural_applications_product_name", table_name="agricultural_applications")
    op.drop_index("ix_agricultural_applications_category", table_name="agricultural_applications")
    op.drop_index("ix_agricultural_applications_crop_id", table_name="agricultural_applications")
    op.drop_index("ix_agricultural_applications_field_id", table_name="agricultural_applications")
    op.drop_index("ix_agricultural_applications_farm_id", table_name="agricultural_applications")
    op.drop_table("agricultural_applications")
