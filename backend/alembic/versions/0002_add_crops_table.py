"""Add crops table
 
Revision ID: 0002_add_crops_table
Revises: 0001_initial_core
Create Date: 2026-10-07 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0002_add_crops_table"
down_revision: Union[str, None] = "0001_initial_core"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "crops",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("field_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("variety", sa.String(length=120), nullable=False),
        sa.Column("season", sa.String(length=60), nullable=True),
        sa.Column("sowing_date", sa.Date(), nullable=False),
        sa.Column("expected_harvest_date", sa.Date(), nullable=True),
        sa.Column("actual_harvest_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="planned", nullable=False),
        sa.Column("planted_area", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("planted_area_unit", sa.String(length=20), server_default="acres", nullable=False),
        sa.Column("seed_quantity", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("seed_unit", sa.String(length=20), server_default="kg", nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["field_id"], ["fields.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "status IN ('planned', 'growing', 'ready_to_harvest', 'harvested', 'failed')",
            name="check_valid_crop_status",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_crops_id"), "crops", ["id"], unique=False)
    op.create_index(op.f("ix_crops_field_id"), "crops", ["field_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_crops_field_id"), table_name="crops")
    op.drop_index(op.f("ix_crops_id"), table_name="crops")
    op.drop_table("crops")
