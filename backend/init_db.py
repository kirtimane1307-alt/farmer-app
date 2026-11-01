"""Database Initialization and Verification Script.

Usage:
  python init_db.py
"""

import sys
import logging
from sqlalchemy import inspect, text

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

from app.core.config import settings
from app.database.connection import engine, check_database_connection
from app.database.base import Base
import app.models  # Load User, Farm, Field


def init_database():
    """Verify connection, create core schema tables, and inspect created structures."""
    print("=" * 60)
    print(" Farm Management System - Database Initialization")
    print("=" * 60)
    print(f"Target Database URL: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else 'localhost'}")

    # 1. Connection check
    print("\n[1/3] Testing PostgreSQL connectivity...")
    if not check_database_connection():
        print("  [ERROR] Cannot connect to PostgreSQL database.")
        print("  Please ensure:")
        print("    1. PostgreSQL server or Docker container is running (e.g., docker-compose up -d)")
        print("    2. DATABASE_URL in .env points to valid credentials")
        return False

    print("  [OK] Connection to PostgreSQL established successfully.")

    # 2. Table creation
    print("\n[2/3] Synchronizing core database tables (users, farms, fields)...")
    try:
        Base.metadata.create_all(bind=engine)
        print("  [OK] Core tables created or verified.")
    except Exception as e:
        print(f"  [ERROR] Failed to create tables: {e}")
        return False

    # 3. Verification inspection
    print("\n[3/3] Inspecting PostgreSQL schema...")
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"  Found {len(tables)} tables in database:")
        for tbl in ["users", "farms", "fields", "crops", "labour", "attendance"]:
            if tbl in tables:
                cols = [c["name"] for c in inspector.get_columns(tbl)]
                pks = inspector.get_pk_constraint(tbl).get("constrained_columns", [])
                fks = [fk["referred_table"] for fk in inspector.get_foreign_keys(tbl)]
                print(f"    - Table '{tbl}': {len(cols)} columns | PK: {pks} | FK -> {fks}")
            else:
                print(f"    - [WARNING] Expected table '{tbl}' was not found.")
    except Exception as e:
        print(f"  [ERROR] Schema inspection failed: {e}")
        return False

    print("\n" + "=" * 60)
    print(" Database Foundation Initialization Complete.")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
