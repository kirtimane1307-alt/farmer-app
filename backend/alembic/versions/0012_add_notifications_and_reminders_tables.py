"""Add notifications, reminders, and notification_preferences tables for Phase 19

Revision ID: 0012_add_notifications_and_reminders_tables
Revises: 0011_add_farm_calendar_events_table
Create Date: 2026-10-31 00:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0012_add_notifications_and_reminders_tables"
down_revision: Union[str, None] = "0011_add_farm_calendar_events_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


NOTIFICATION_CATEGORIES = (
    "crop",
    "irrigation",
    "fertilizer_pesticide",
    "labour_attendance",
    "salary_payment",
    "harvest",
    "expense_finance",
    "equipment_maintenance",
    "calendar_event",
    "custom_reminder",
    "general",
)

NOTIFICATION_PRIORITIES = ("low", "medium", "high", "urgent")
REMINDER_RECURRENCE_TYPES = ("none", "daily", "weekly", "monthly")
REMINDER_STATUSES = ("pending", "completed", "dismissed", "overdue")


def upgrade() -> None:
    # 1. Create notifications table
    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("priority", sa.String(length=20), server_default="medium", nullable=False),
        sa.Column("related_module", sa.String(length=50), nullable=True),
        sa.Column("related_record_id", sa.String(length=100), nullable=True),
        sa.Column("action_url", sa.String(length=255), nullable=True),
        sa.Column("is_read", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_notif_user_read", "notifications", ["user_id", "is_read"])
    op.create_index("idx_notif_user_cat", "notifications", ["user_id", "category"])
    op.create_index("idx_notif_user_module_record", "notifications", ["user_id", "related_module", "related_record_id"])
    op.create_index("idx_notif_user_created", "notifications", ["user_id", "created_at"])

    # 2. Create reminders table
    op.create_table(
        "reminders",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=True),
        sa.Column("field_id", sa.Uuid(), nullable=True),
        sa.Column("crop_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=50), server_default="general", nullable=False),
        sa.Column("priority", sa.String(length=20), server_default="medium", nullable=False),
        sa.Column("reminder_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("recurrence_type", sa.String(length=20), server_default="none", nullable=False),
        sa.Column("recurrence_interval", sa.Integer(), server_default="1", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["field_id"], ["fields.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["crop_id"], ["crops.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_reminder_user_status_datetime", "reminders", ["user_id", "status", "reminder_datetime"])

    # 3. Create notification_preferences table
    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("advance_notice_days", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "category", name="uq_user_notif_pref_category"),
    )


def downgrade() -> None:
    op.drop_table("notification_preferences")
    op.drop_index("idx_reminder_user_status_datetime", table_name="reminders")
    op.drop_table("reminders")
    op.drop_index("idx_notif_user_created", table_name="notifications")
    op.drop_index("idx_notif_user_module_record", table_name="notifications")
    op.drop_index("idx_notif_user_cat", table_name="notifications")
    op.drop_index("idx_notif_user_read", table_name="notifications")
    op.drop_table("notifications")

