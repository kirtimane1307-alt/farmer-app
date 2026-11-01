"""Main API router collecting all system and domain sub-routers."""

from datetime import datetime
from fastapi import APIRouter
from app.core.config import settings
from app.database.connection import check_database_connection, test_database_latency
from app.database.base import Base
import app.models  # Ensure models are loaded into Base.metadata
from app.schemas.common import SuccessResponse, HealthResponse, DatabasePingResponse
from app.routes.auth import auth_router
from app.routes.farms import farms_router
from app.routes.fields import fields_router
from app.routes.crops import crops_router
from app.routes.labour import labour_router
from app.routes.attendance import attendance_router
from app.routes.salary import salary_router
from app.routes.application import application_router
from app.routes.expense import expense_router
from app.routes.equipment import equipment_router, convenience_router as equipment_convenience_router
from app.routes.harvest import harvest_router, harvest_convenience_router
from app.routes.sale import sale_router, sale_convenience_router
from app.routes.income import income_router, income_convenience_router
from app.routes.finance import finance_router
from app.routes.calendar import calendar_router, calendar_convenience_router
from app.routes.dashboard import dashboard_router
from app.routes.reports import reports_router
from app.routes.notifications import (
    notifications_router,
    reminders_router,
    preferences_router,
)

api_router = APIRouter()

# Mount Authentication router
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])

# Mount Farms, Fields, Crops, Labour, Attendance, Salaries, Applications, Expenses, Equipment, Harvest, Sales, Income, Calendar, and Dashboard routers
api_router.include_router(farms_router, prefix="/farms", tags=["Farms"])
api_router.include_router(fields_router, prefix="/fields", tags=["Fields"])
api_router.include_router(crops_router, prefix="/crops", tags=["Crops"])
api_router.include_router(labour_router, prefix="/labour", tags=["Labour"])
api_router.include_router(attendance_router, prefix="/attendance", tags=["Attendance"])
api_router.include_router(salary_router, prefix="/salaries", tags=["Salaries"])
api_router.include_router(application_router, prefix="/applications", tags=["Applications"])
api_router.include_router(expense_router, prefix="/expenses", tags=["Expenses"])
api_router.include_router(equipment_router, prefix="/equipment", tags=["Equipment"])
api_router.include_router(harvest_router, prefix="/harvests", tags=["Harvest"])
api_router.include_router(sale_router, prefix="/sales", tags=["Sales"])
api_router.include_router(income_router, prefix="/income", tags=["Other Income"])
api_router.include_router(calendar_router, prefix="/calendar", tags=["Farm Calendar"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard Analytics"])
api_router.include_router(reports_router, prefix="/reports", tags=["Reports Management"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications & Reminders"])
api_router.include_router(reminders_router, prefix="/reminders", tags=["Notifications & Reminders"])
api_router.include_router(preferences_router, prefix="/notification-preferences", tags=["Notifications & Reminders"])
api_router.include_router(finance_router)
api_router.include_router(equipment_convenience_router)
api_router.include_router(harvest_convenience_router)
api_router.include_router(sale_convenience_router)
api_router.include_router(income_convenience_router)
api_router.include_router(calendar_convenience_router)



@api_router.get("/health", response_model=HealthResponse, tags=["System"])
def get_system_health():
    """Health check endpoint safely verifying application and database connectivity."""
    is_db_connected = check_database_connection()
    return HealthResponse(
        status="healthy" if is_db_connected else "degraded",
        project_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database="connected" if is_db_connected else "disconnected",
        database_connected=is_db_connected,
    )


@api_router.get("/database/ping", response_model=SuccessResponse[DatabasePingResponse], tags=["Database"])
def ping_database():
    """Safe database connectivity test returning latency and registered ORM tables."""
    is_connected, latency_ms, error_msg = test_database_latency()
    registered_tables = list(Base.metadata.tables.keys())

    return SuccessResponse(
        success=is_connected,
        message="Database reachable and responsive" if is_connected else f"Database unreachable: {error_msg}",
        data=DatabasePingResponse(
            database="PostgreSQL",
            connected=is_connected,
            latency_ms=latency_ms,
            tables_registered=registered_tables,
        ),
    )


@api_router.get("/info", response_model=SuccessResponse[dict], tags=["System"])
def get_system_info():
    """System information endpoint returning architecture details and active phase status."""
    return SuccessResponse(
        message="System information retrieved successfully",
        data={
            "name": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "phase": "Phase 18: Reports Management",
            "server_time": datetime.utcnow().isoformat(),
            "architecture": {
                "frontend": "Next.js + TypeScript + Tailwind CSS",
                "backend": "Python + FastAPI",
                "database": "PostgreSQL 16",
                "orm": "SQLAlchemy 2.0",
                "migrations": "Alembic",
            },
            "core_tables_designed": [
                "users",
                "farms",
                "fields",
                "crops",
                "labour",
                "attendance",
                "salary_records",
                "salary_payments",
                "agricultural_applications",
                "expenses",
                "expense_payments",
                "equipment",
                "equipment_maintenance",
                "harvests",
                "sales",
                "sale_payments",
                "other_incomes",
                "farm_calendar_events",
            ],
            "primary_key_strategy": "UUID (PostgreSQL native)",
        },
    )
