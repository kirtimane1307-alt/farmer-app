"""Labour/Worker database model definition."""

from sqlalchemy import Column, String, Numeric, Text, Date, ForeignKey, CheckConstraint
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database.base import BaseDBModel


class Labour(BaseDBModel):
    """Labour entity representing farm workers and their wage/employment agreements."""

    __tablename__ = "labour"

    farm_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(120), nullable=False)
    phone = Column(String(30), nullable=True)
    address = Column(String(255), nullable=True)
    work_type = Column(String(60), default="General Labour", nullable=False)
    daily_wage = Column(Numeric(10, 2), nullable=False)
    joining_date = Column(Date, nullable=False)
    status = Column(String(20), default="active", nullable=False, index=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("daily_wage >= 0", name="check_positive_daily_wage"),
        CheckConstraint(
            "status IN ('active', 'inactive')",
            name="check_valid_labour_status",
        ),
    )

    # Relationships
    farm = relationship("Farm", back_populates="labourers")
    attendances = relationship("Attendance", back_populates="labour", cascade="all, delete-orphan")
    salaries = relationship("SalaryRecord", back_populates="labour", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Labour(id={self.id}, name='{self.name}', work_type='{self.work_type}', daily_wage={self.daily_wage}, status='{self.status}')>"
