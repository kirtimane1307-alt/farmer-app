"""Farm database model definition."""

from sqlalchemy import Column, String, Numeric, ForeignKey, CheckConstraint
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database.base import BaseDBModel


class Farm(BaseDBModel):
    """Farm entity representing an agricultural landholding owned by a user."""

    __tablename__ = "farms"

    user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(120), nullable=False)
    location = Column(String(255), nullable=False)
    total_area = Column(Numeric(10, 2), nullable=False)
    area_unit = Column(String(20), default="acres", nullable=False)

    __table_args__ = (
        CheckConstraint("total_area > 0", name="check_positive_farm_area"),
    )

    # Relationships
    user = relationship("User", back_populates="farms")
    fields = relationship(
        "Field",
        back_populates="farm",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    labourers = relationship(
        "Labour",
        back_populates="farm",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Farm(id={self.id}, name='{self.name}', total_area={self.total_area} {self.area_unit})>"
