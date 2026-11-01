"""Farm Calendar & Activity database model definition."""

from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    CheckConstraint,
    Index,
)
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import BaseDBModel

# Permitted Activity Types for agricultural operations
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


class FarmCalendarEvent(BaseDBModel):
    """Represents a scheduled, in-progress, or completed agricultural task/event on the farm calendar."""

    __tablename__ = "farm_calendar_events"

    # Mandatory farm context
    farm_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Optional plot and crop associations
    field_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("fields.id", ondelete="SET NULL"),
        nullable=True,
    )
    crop_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("crops.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Optional workforce assignment
    assigned_labour_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("labour.id", ondelete="SET NULL"),
        nullable=True,
    )

    # User who scheduled the activity
    created_by_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Core activity parameters
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    activity_type = Column(String(60), nullable=False)

    # Timing
    start_datetime = Column(DateTime(timezone=True), nullable=False)
    end_datetime = Column(DateTime(timezone=True), nullable=True)
    all_day = Column(Boolean, default=False, nullable=False)

    # Workflow state & criticality
    status = Column(String(30), default="planned", nullable=False)
    priority = Column(String(20), default="medium", nullable=False)

    # Cross-module traceability (optional references)
    related_module = Column(String(60), nullable=True)
    related_record_id = Column(String(100), nullable=True)

    # Actual outcome tracking
    actual_completion_datetime = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            f"activity_type IN {CALENDAR_ACTIVITY_TYPES}",
            name="check_valid_activity_type",
        ),
        CheckConstraint(
            f"status IN {CALENDAR_EVENT_STATUSES}",
            name="check_valid_event_status",
        ),
        CheckConstraint(
            f"priority IN {CALENDAR_EVENT_PRIORITIES}",
            name="check_valid_event_priority",
        ),
        CheckConstraint(
            "end_datetime IS NULL OR end_datetime >= start_datetime",
            name="check_valid_event_date_range",
        ),
        Index("idx_cal_events_farm_start", "farm_id", "start_datetime"),
        Index("idx_cal_events_farm_status", "farm_id", "status"),
        Index("idx_cal_events_farm_type", "farm_id", "activity_type"),
        Index("idx_cal_events_field", "field_id"),
        Index("idx_cal_events_crop", "crop_id"),
        Index("idx_cal_events_labour", "assigned_labour_id"),
    )

    # Relationships
    farm = relationship("Farm", backref="calendar_events")
    field = relationship("Field")
    crop = relationship("Crop")
    assigned_labour = relationship("Labour")
    created_by = relationship("User")

    def __repr__(self) -> str:
        return (
            f"<FarmCalendarEvent(id={self.id}, title='{self.title}', "
            f"type='{self.activity_type}', start={self.start_datetime}, status='{self.status}')>"
        )
