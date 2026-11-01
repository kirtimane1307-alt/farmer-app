"""User database model definition."""

from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.database.base import BaseDBModel


class User(BaseDBModel):
    """User account entity storing identity and credentials for farm owners/managers."""

    __tablename__ = "users"

    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)

    # Relationships
    farms = relationship(
        "Farm",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', name='{self.name}')>"
