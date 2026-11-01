"""SQLAlchemy Declarative Base, Mixins, and Model foundation."""

import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, func
from sqlalchemy.types import Uuid
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class TimestampMixin:
    """Mixin adding standard timezone-aware created_at and updated_at timestamps."""
    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
    )


class BaseDBModel(Base, TimestampMixin):
    """Abstract base model with UUID primary key and timestamp tracking."""
    __abstract__ = True

    id = Column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
        index=True,
    )
