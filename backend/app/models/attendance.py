"""Attendance database model definition."""

from sqlalchemy import Column, String, Integer, Text, Date, Time, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database.base import BaseDBModel


class Attendance(BaseDBModel):
    """Daily attendance and working hours log for farm labour workers."""

    __tablename__ = "attendance"

    labour_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("labour.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attendance_date = Column(Date, nullable=False, index=True)
    status = Column(String(20), default="present", nullable=False, index=True)
    check_in = Column(Time, nullable=True)
    check_out = Column(Time, nullable=True)
    working_minutes = Column(Integer, default=0, nullable=False)
    overtime_minutes = Column(Integer, default=0, nullable=False)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("labour_id", "attendance_date", name="uq_labour_attendance_date"),
        CheckConstraint("working_minutes >= 0", name="check_positive_working_minutes"),
        CheckConstraint("overtime_minutes >= 0", name="check_positive_overtime_minutes"),
        CheckConstraint(
            "status IN ('present', 'absent', 'half_day', 'leave')",
            name="check_valid_attendance_status",
        ),
    )

    # Relationships
    labour = relationship("Labour", back_populates="attendances")

    def __repr__(self) -> str:
        return (
            f"<Attendance(id={self.id}, labour_id={self.labour_id}, "
            f"date='{self.attendance_date}', status='{self.status}', "
            f"working_minutes={self.working_minutes}, overtime_minutes={self.overtime_minutes})>"
        )
