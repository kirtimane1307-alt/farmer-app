"""Add farm_calendar_events table for Phase 16: Farm Calendar Management

Revision ID: 0011_add_farm_calendar_events_table
Revises: 0010_add_sales_and_income_tables
Create Date: 2026-10-19 23:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0011_add_farm_calendar_events_table"
down_revision: Union[str, None] = "0010_add_sales_and_income_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CALENDAR_ACTIVITY_TYPES = (
    "general_task",
    "land_preparation",
    "sowing",
    "transplanting",
    "fertilizer_application",
    "pesticide_application",
    "irrigation",
    "weeding",
    "pruning",
    "crop_inspection",
    "labour_assignment",
    "harvesting",
    "equipment_maintenance",
    "sales_appointment",
    "other",
)

CALENDAR_EVENT_STATUSES = ("planned", "in_progress", "completed", "cancelled")
CALENDAR_EVENT_PRIORITIES = ("low", "medium", "high")


def upgrade() -> None:
    # 1. Create farm_calendar_events table
    op.create_table(
        "farm_calendar_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=False),
        sa.Column("field_id", sa.Uuid(), nullable=True),
        sa.Column("crop_id", sa.Uuid(), nullable=True),
        sa.Column("assigned_labour_id", sa.Uuid(), nullable=True),
        sa.Column("created_by_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("activity_type", sa.String(length=60), nullable=False),
        sa.Column("start_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_datetime", sa.DateTime(timezone=True), nullable=True),
        sa.Column("all_day", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("status", sa.String(length=30), server_default="planned", nullable=False),
        sa.Column("priority", sa.String(length=20), server_default="medium", nullable=False),
        sa.Column("related_module", sa.String(length=60), nullable=True),
        sa.Column("related_record_id", sa.String(length=100), nullable=True),
        sa.Column("actual_completion_datetime", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["field_id"], ["fields.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["crop_id"], ["crops.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["assigned_labour_id"], ["labour.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.CheckConstraint(f"activity_type IN {CALENDAR_ACTIVITY_TYPES}", name="check_valid_activity_type"),
        sa.CheckConstraint(f"status IN {CALENDAR_EVENT_STATUSES}", name="check_valid_event_status"),
        sa.CheckConstraint(f"priority IN {CALENDAR_EVENT_PRIORITIES}", name="check_valid_event_priority"),
        sa.CheckConstraint("end_datetime IS NULL OR end_datetime >= start_datetime", name="check_valid_event_date_range"),
        sa.PrimaryKeyConstraint("id"),
    )

    # 2. Create performance indexes
    op.create_index("idx_cal_events_farm_start", "farm_calendar_events", ["farm_id", "start_datetime"])
    op.create_index("idx_cal_events_farm_status", "farm_calendar_events", ["farm_id", "status"])
    op.create_index("idx_cal_events_farm_type", "farm_calendar_events", ["farm_id", "activity_type"])
    op.create_index("idx_cal_events_field", "farm_calendar_events", ["field_id"])
    op.create_index("idx_cal_events_crop", "farm_calendar_events", ["crop_id"])
    op.create_index("idx_cal_events_labour", "farm_calendar_events", ["assigned_labour_id"])


def downgrade() -> None:
    op.drop_index("idx_cal_events_labour", table_name="farm_calendar_events")
    op.drop_index("idx_cal_events_crop", table_name="farm_calendar_events")
    op.drop_index("idx_cal_events_field", table_name="farm_calendar_events")
    op.drop_index("idx_cal_events_farm_type", table_name="farm_calendar_events")
    op.drop_index("idx_cal_events_farm_status", table_name="farm_calendar_events")
    op.drop_index("idx_cal_events_farm_start", table_name="farm_calendar_events")
    op.drop_table("farm_calendar_events")
