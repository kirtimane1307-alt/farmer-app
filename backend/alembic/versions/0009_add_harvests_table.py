"""Add harvests table for Phase 14

Revision ID: 0009_add_harvests_table
Revises: 0008_add_equipment_and_maintenance_tables
Create Date: 2026-10-19 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0009_add_harvests_table"
down_revision: Union[str, None] = "0008_add_equipment_and_maintenance_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "harvests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=False),
        sa.Column("field_id", sa.Uuid(), nullable=False),
        sa.Column("crop_id", sa.Uuid(), nullable=False),
        sa.Column("harvest_date", sa.Date(), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("unit", sa.String(length=30), server_default="kg", nullable=False),
        sa.Column("quality_grade", sa.String(length=30), server_default="Standard", nullable=True),
        sa.Column("harvest_method", sa.String(length=60), nullable=True),
        sa.Column("storage_location", sa.String(length=150), nullable=True),
        sa.Column("batch_number", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("quantity > 0", name="check_positive_harvest_quantity"),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["field_id"], ["fields.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["crop_id"], ["crops.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(op.f("ix_harvests_id"), "harvests", ["id"], unique=False)
    op.create_index(op.f("ix_harvests_farm_id"), "harvests", ["farm_id"], unique=False)
    op.create_index(op.f("ix_harvests_field_id"), "harvests", ["field_id"], unique=False)
    op.create_index(op.f("ix_harvests_crop_id"), "harvests", ["crop_id"], unique=False)
    op.create_index(op.f("ix_harvests_harvest_date"), "harvests", ["harvest_date"], unique=False)
    op.create_index("ix_harvests_farm_date", "harvests", ["farm_id", "harvest_date"], unique=False)
    op.create_index("ix_harvests_field_date", "harvests", ["field_id", "harvest_date"], unique=False)
    op.create_index("ix_harvests_crop_date", "harvests", ["crop_id", "harvest_date"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_harvests_crop_date", table_name="harvests")
    op.drop_index("ix_harvests_field_date", table_name="harvests")
    op.drop_index("ix_harvests_farm_date", table_name="harvests")
    op.drop_index(op.f("ix_harvests_harvest_date"), table_name="harvests")
    op.drop_index(op.f("ix_harvests_crop_id"), table_name="harvests")
    op.drop_index(op.f("ix_harvests_field_id"), table_name="harvests")
    op.drop_index(op.f("ix_harvests_farm_id"), table_name="harvests")
    op.drop_index(op.f("ix_harvests_id"), table_name="harvests")
    op.drop_table("harvests")
