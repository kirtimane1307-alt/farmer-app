"""Add labour table

Revision ID: 0003_add_labour_table
Revises: 0002_add_crops_table
Create Date: 2026-10-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003_add_labour_table"
down_revision: Union[str, None] = "0002_add_crops_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "labour",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("work_type", sa.String(length=60), server_default="General Labour", nullable=False),
        sa.Column("daily_wage", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("joining_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"], ondelete="CASCADE"),
        sa.CheckConstraint("daily_wage >= 0", name="check_positive_daily_wage"),
        sa.CheckConstraint(
            "status IN ('active', 'inactive')",
            name="check_valid_labour_status",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_labour_id"), "labour", ["id"], unique=False)
    op.create_index(op.f("ix_labour_farm_id"), "labour", ["farm_id"], unique=False)
    op.create_index(op.f("ix_labour_status"), "labour", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_labour_status"), table_name="labour")
    op.drop_index(op.f("ix_labour_farm_id"), table_name="labour")
    op.drop_index(op.f("ix_labour_id"), table_name="labour")
    op.drop_table("labour")
