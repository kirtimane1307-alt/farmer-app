"""Notification, Reminder, and Notification Preference database model definitions."""

from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    Integer,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
)
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database.base import BaseDBModel

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


class Notification(BaseDBModel):
    """Represents a system or user-generated notification."""

    __tablename__ = "notifications"

    user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    farm_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)
    priority = Column(String(20), default="medium", nullable=False)

    related_module = Column(String(50), nullable=True)
    related_record_id = Column(String(100), nullable=True)
    action_url = Column(String(255), nullable=True)

    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    farm = relationship("Farm", foreign_keys=[farm_id])

    __table_args__ = (
        Index("idx_notif_user_read", "user_id", "is_read"),
        Index("idx_notif_user_cat", "user_id", "category"),
        Index("idx_notif_user_module_record", "user_id", "related_module", "related_record_id"),
        Index("idx_notif_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, title='{self.title}', category='{self.category}', is_read={self.is_read})>"


class Reminder(BaseDBModel):
    """Represents a user-defined agricultural reminder with recurrence support."""

    __tablename__ = "reminders"

    user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    farm_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    field_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("fields.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    crop_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("crops.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default="general", nullable=False, index=True)
    priority = Column(String(20), default="medium", nullable=False)

    reminder_datetime = Column(DateTime(timezone=True), nullable=False, index=True)
    recurrence_type = Column(String(20), default="none", nullable=False)
    recurrence_interval = Column(Integer, default=1, nullable=False)

    status = Column(String(20), default="pending", nullable=False, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    farm = relationship("Farm", foreign_keys=[farm_id])
    field = relationship("Field", foreign_keys=[field_id])
    crop = relationship("Crop", foreign_keys=[crop_id])

    __table_args__ = (
        Index("idx_reminder_user_status_datetime", "user_id", "status", "reminder_datetime"),
    )

    def __repr__(self) -> str:
        return f"<Reminder(id={self.id}, title='{self.title}', status='{self.status}', reminder_datetime={self.reminder_datetime})>"


class NotificationPreference(BaseDBModel):
    """User-configured preferences for notifications and advance notice windows."""

    __tablename__ = "notification_preferences"

    user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category = Column(String(50), nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    advance_notice_days = Column(Integer, default=1, nullable=False)

    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        UniqueConstraint("user_id", "category", name="uq_user_notif_pref_category"),
    )

    def __repr__(self) -> str:
        return f"<NotificationPreference(user_id={self.user_id}, category='{self.category}', enabled={self.is_enabled})>"

