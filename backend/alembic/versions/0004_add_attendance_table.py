"""Add attendance table

Revision ID: 0004_add_attendance_table
Revises: 0003_add_labour_table
Create Date: 2026-10-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0004_add_attendance_table"
down_revision: Union[str, None] = "0003_add_labour_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "attendance",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("labour_id", sa.Uuid(), nullable=False),
        sa.Column("attendance_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="present", nullable=False),
        sa.Column("check_in", sa.Time(), nullable=True),
        sa.Column("check_out", sa.Time(), nullable=True),
        sa.Column("working_minutes", sa.Integer(), server_default="0", nullable=False),
        sa.Column("overtime_minutes", sa.Integer(), server_default="0", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["labour_id"], ["labour.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("labour_id", "attendance_date", name="uq_labour_attendance_date"),
        sa.CheckConstraint("working_minutes >= 0", name="check_positive_working_minutes"),
        sa.CheckConstraint("overtime_minutes >= 0", name="check_positive_overtime_minutes"),
        sa.CheckConstraint(
            "status IN ('present', 'absent', 'half_day', 'leave')",
            name="check_valid_attendance_status",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_attendance_id"), "attendance", ["id"], unique=False)
    op.create_index(op.f("ix_attendance_labour_id"), "attendance", ["labour_id"], unique=False)
    op.create_index(op.f("ix_attendance_attendance_date"), "attendance", ["attendance_date"], unique=False)
    op.create_index(op.f("ix_attendance_status"), "attendance", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_attendance_status"), table_name="attendance")
    op.drop_index(op.f("ix_attendance_attendance_date"), table_name="attendance")
    op.drop_index(op.f("ix_attendance_labour_id"), table_name="attendance")
    op.drop_index(op.f("ix_attendance_id"), table_name="attendance")
    op.drop_table("attendance")
