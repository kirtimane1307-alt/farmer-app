"""Database engine configuration, connection pooling, and session management."""

import logging
import time
from typing import Generator, Tuple
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("farm-management.database")

# Configure SQLAlchemy engine with connection pool
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine_kwargs = {
    "echo": False,
}
if not is_sqlite:
    engine_kwargs.update({
        "pool_pre_ping": True,  # Automatically detect disconnected connections
        "pool_size": 10,        # Number of connections to keep open
        "max_overflow": 20,     # Maximum temporary overflow connections
    })

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency providing a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> bool:
    """Safe check for database connectivity. Returns True if connected, False otherwise."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            return True
    except Exception as e:
        logger.warning(f"Database connection probe failed: {e}")
        return False


def test_database_latency() -> Tuple[bool, float, str]:
    """Test database latency in milliseconds without exposing credentials.
    
    Returns:
        (is_connected: bool, latency_ms: float, error_message: str)
    """
    start_time = time.time()
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            latency_ms = round((time.time() - start_time) * 1000, 2)
            return True, latency_ms, ""
    except Exception as e:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        # Sanitize error message to avoid exposing passwords
        error_msg = str(e).split("\n")[0]
        return False, latency_ms, error_msg
