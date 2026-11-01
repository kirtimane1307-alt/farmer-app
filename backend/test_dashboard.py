"""Automated Test Suite for Phase 17: Dashboard Analytics + Recharts.

Validates:
1. Multi-tenant user registration & authentication (Tenant Alice & Tenant Bob).
2. Base farms, fields, crops, labour, attendance, expenses, sales, income, harvests, and calendar events registered.
3. Unauthenticated access enforcement (HTTP 401 Unauthorized).
4. Consolidated dashboard analytics (/api/dashboard/analytics and /api/dashboard):
   - Top-level KPI counts (farms, fields, crops, workforce, attendance).
   - Financial totals: Sales Revenue, Other Income, Total Income, Operating Expenses, Net Profit/Loss, Margin %.
   - Net Profit/Loss calculation rule: Total Income - Total Expenses.
   - Recharts visual datasets:
     * Income vs Expenses monthly trend.
     * Expense category breakdown with percentage shares.
     * Workforce attendance trend over time.
     * Crop land distribution by variety and status.
     * Harvest yield output timeline.
     * Upcoming farm calendar activities.
5. Farm-level filtering:
   - Filtering by valid owned farm aggregates only that farm's metrics.
   - Cross-user tenant farm access strictly rejected with HTTP 404 (IDOR prevention).
6. Date-range filtering:
   - Valid start_date and end_date correctly filter financial and operational records.
   - Invalid date ranges (start_date > end_date) rejected with HTTP 400 Bad Request.
7. Multi-tenant isolation:
   - Tenant B's independent dashboard shows zero metrics for Tenant A's estates.
8. Sub-endpoints modular verification:
   - /api/dashboard/summary
   - /api/dashboard/financial-overview
   - /api/dashboard/income-expense-trend
   - /api/dashboard/expense-breakdown
   - /api/dashboard/attendance-trend
   - /api/dashboard/crop-distribution
   - /api/dashboard/harvest-trend
   - /api/dashboard/upcoming-activities
"""

import sys
import os
from datetime import date, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.base import Base
from app.database.connection import get_db
import app.models  # Registers all models
from app.main import app
from app.core.config import settings

# In-memory SQLite isolated testing database
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def run_tests():
    print("=" * 65)
    print(" Running Phase 17 Dashboard Analytics Automated Test Suite")
    print("=" * 65)

    # Initialize all tables in test database
    Base.metadata.create_all(bind=engine)
    print("[PASS] In-memory database tables initialized")

    # 1. Register Tenant Alice & Tenant Bob
    resp_a = client.post(
        "/api/auth/register",
        json={
            "name": "Alice Farm Director",
            "email": "alice.dashboard@example.com",
            "password": "SecurePassword123!",
            "phone": "+91 98765 11111",
        },
    )
    assert resp_a.status_code == 201
    token_a = resp_a.json()["data"]["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    resp_b = client.post(
        "/api/auth/register",
        json={
            "name": "Bob Farm Owner",
            "email": "bob.dashboard@example.com",
            "password": "SecurePassword123!",
            "phone": "+91 98765 22222",
        },
    )
    assert resp_b.status_code == 201
    token_b = resp_b.json()["data"]["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    client.cookies.clear()
    print("[PASS] Tenant Alice and Tenant Bob registered and authenticated")

    # 2. Setup Alice's Farm Estate
    farm_a = client.post(
        "/api/farms",
        json={"name": "Alice Green Acres", "location": "Nashik", "total_area": 40.0, "area_unit": "Acres"},
        headers=headers_a,
    ).json()
    farm_a_id = farm_a["id"]

    # Alice's Fields
    field_a1 = client.post(
        f"/api/farms/{farm_a_id}/fields",
        json={"name": "Plot North 1", "area": 20.0, "area_unit": "Acres", "soil_type": "Loam"},
        headers=headers_a,
    ).json()
    field_a1_id = field_a1["id"]

    field_a2 = client.post(
        f"/api/farms/{farm_a_id}/fields",
        json={"name": "Plot South 2", "area": 15.0, "area_unit": "Acres", "soil_type": "Clay"},
        headers=headers_a,
    ).json()
    field_a2_id = field_a2["id"]

    # Alice's Crops
    crop_a1 = client.post(
        "/api/crops",
        json={
            "field_id": field_a1_id,
            "name": "Durum Wheat",
            "variety": "WH 147",
            "sowing_date": "2026-10-01",
            "status": "growing",
            "planted_area": 18.0,
            "planted_area_unit": "Acres",
        },
        headers=headers_a,
    ).json()
    crop_a1_id = crop_a1["id"]

    crop_a2 = client.post(
        "/api/crops",
        json={
            "field_id": field_a2_id,
            "name": "Sweet Corn",
            "variety": "Sugar 75",
            "sowing_date": "2026-10-05",
            "status": "growing",
            "planted_area": 12.0,
            "planted_area_unit": "Acres",
        },
        headers=headers_a,
    ).json()
    crop_a2_id = crop_a2["id"]

    # Alice's Labour & Attendance
    labour_a = client.post(
        "/api/labour",
        json={
            "farm_id": farm_a_id,
            "name": "Ramesh Kumar",
            "work_type": "Harvester",
            "daily_wage": 450.0,
            "joining_date": "2026-09-01",
        },
        headers=headers_a,
    ).json()
    labour_a_id = labour_a["id"]

    client.post(
        "/api/attendance",
        json={
            "labour_id": labour_a_id,
            "attendance_date": date.today().isoformat(),
            "status": "present",
            "working_minutes": 480,
            "overtime_minutes": 60,
        },
        headers=headers_a,
    )

    # Alice's Operational Expenses
    # Expense 1: Seeds (15,000)
    client.post(
        "/api/expenses",
        json={
            "farm_id": farm_a_id,
            "category": "seeds",
            "title": "Certified Hybrid Wheat Seeds",
            "amount": 15000.0,
            "expense_date": "2026-10-02",
        },
        headers=headers_a,
    )
    # Expense 2: Fertilizer (25,000)
    client.post(
        "/api/expenses",
        json={
            "farm_id": farm_a_id,
            "category": "fertilizer",
            "title": "Organic NPK Fertilizer",
            "amount": 25000.0,
            "expense_date": "2026-10-05",
        },
        headers=headers_a,
    )
    # Total Expenses = 40,000.00

    # Alice's Produce Harvest
    harv_a = client.post(
        "/api/harvests",
        json={
            "farm_id": farm_a_id,
            "field_id": field_a1_id,
            "crop_id": crop_a1_id,
            "harvest_date": "2026-10-15",
            "quantity": 3000.0,
            "unit": "kg",
            "quality_grade": "Grade A",
        },
        headers=headers_a,
    ).json()
    harv_a_id = harv_a["id"]

    # Alice's Produce Sales
    # Sale 1: 50,000 gross, 2,000 discount = 48,000 revenue
    client.post(
        "/api/sales",
        json={
            "farm_id": farm_a_id,
            "crop_id": crop_a1_id,
            "harvest_id": harv_a_id,
            "sale_date": "2026-10-18",
            "buyer_name": "Agro Grain Wholesalers",
            "product_name": "Durum Wheat Grain",
            "quantity": 2000.0,
            "unit": "kg",
            "unit_price": 25.0,
            "discount_amount": 2000.0,
            "upfront_payment": 30000.0,
            "payment_method": "bank_transfer",
        },
        headers=headers_a,
    )

    # Alice's Other Income
    # Subsidy: 20,000
    res_inc = client.post(
        "/api/income",
        json={
            "farm_id": farm_a_id,
            "category": "government_subsidy",
            "description": "State Organic Agriculture Subsidy",
            "source": "State Agriculture Dept",
            "amount": 20000.0,
            "income_date": "2026-10-20",
        },
        headers=headers_a,
    )
    assert res_inc.status_code == 201, f"Failed to create other income: {res_inc.text}"

    # Alice's Calendar Events
    client.post(
        "/api/calendar/events",
        json={
            "farm_id": farm_a_id,
            "field_id": field_a2_id,
            "crop_id": crop_a2_id,
            "title": "Irrigation Run: Corn Field",
            "activity_type": "irrigation",
            "start_datetime": "2026-10-28T08:00:00",
            "priority": "high",
        },
        headers=headers_a,
    )
    print("[PASS] Tenant Alice full agricultural domain dataset populated")

    # 3. Setup Bob's Independent Estate
    farm_b = client.post(
        "/api/farms",
        json={"name": "Bob Orchard", "location": "Ratnagiri", "total_area": 25.0, "area_unit": "Acres"},
        headers=headers_b,
    ).json()
    farm_b_id = farm_b["id"]
    print("[PASS] Tenant Bob independent estate registered")

    # 4. Unauthenticated Access Protection (HTTP 401)
    unauth_resp = client.get("/api/dashboard/analytics")
    assert unauth_resp.status_code == 401, f"Expected 401 unauth, got: {unauth_resp.status_code}"
    assert client.get("/api/dashboard/summary").status_code == 401
    assert client.get("/api/dashboard/financial-overview").status_code == 401
    assert client.get("/api/dashboard/income-expense-trend").status_code == 401
    assert client.get("/api/dashboard/expense-breakdown").status_code == 401
    assert client.get("/api/dashboard/attendance-trend").status_code == 401
    assert client.get("/api/dashboard/crop-distribution").status_code == 401
    assert client.get("/api/dashboard/harvest-trend").status_code == 401
    assert client.get("/api/dashboard/upcoming-activities").status_code == 401
    print("[PASS] Unauthenticated dashboard access strictly blocked (HTTP 401)")

    # 5. Consolidated Dashboard Analytics for Alice
    dash_a = client.get("/api/dashboard/analytics", headers=headers_a)
    assert dash_a.status_code == 200, f"Dashboard failed: {dash_a.text}"
    data_a = dash_a.json()

    # KPI verification
    kpi = data_a["kpi"]
    assert kpi["total_farms"] == 1
    assert kpi["total_fields"] == 2
    assert kpi["active_crops"] == 2
    assert kpi["total_labourers"] == 1
    assert kpi["present_today"] == 1
    assert float(kpi["total_planted_area"]) == 30.0

    # Financial verification
    # Sales Revenue: 48,000.00
    # Other Income: 20,000.00
    # Total Income: 68,000.00
    # Expenses: 40,000.00
    # Net Profit: 68,000 - 40,000 = 28,000.00
    assert float(kpi["total_sales_revenue"]) == 48000.0
    assert float(kpi["total_other_income"]) == 20000.0
    assert float(kpi["total_income"]) == 68000.0
    assert float(kpi["total_expenses"]) == 40000.0
    assert float(kpi["net_profit_loss"]) == 28000.0
    assert kpi["is_profit"] is True
    assert float(kpi["profit_margin_percentage"]) == 41.18

    # Recharts trends verification
    assert len(data_a["income_expense_trend"]) >= 1
    trend_oct = [t for t in data_a["income_expense_trend"] if t["period"] == "2026-10"][0]
    assert float(trend_oct["total_income"]) == 68000.0
    assert float(trend_oct["total_expenses"]) == 40000.0
    assert float(trend_oct["net_profit_loss"]) == 28000.0

    # Expense breakdown verification
    exp_bd = data_a["expense_breakdown"]
    assert len(exp_bd) == 2
    cat_names = [c["category"] for c in exp_bd]
    assert "fertilizer" in cat_names and "seeds" in cat_names
    total_pct = sum(float(c["percentage"]) for c in exp_bd)
    assert round(total_pct, 1) == 100.0

    # Attendance trend verification
    assert len(data_a["attendance_trend"]) >= 1
    assert data_a["attendance_trend"][0]["present"] == 1

    # Crop distribution verification
    crop_dist = data_a["crop_distribution"]
    assert len(crop_dist) == 2
    crop_names = [c["crop_name"] for c in crop_dist]
    assert "Durum Wheat" in crop_names and "Sweet Corn" in crop_names

    # Harvest trend verification
    assert len(data_a["harvest_trend"]) == 1
    assert float(data_a["harvest_trend"][0]["quantity"]) == 3000.0

    # Upcoming activities verification
    assert len(data_a["upcoming_activities"]) >= 1
    assert data_a["upcoming_activities"][0]["title"] == "Irrigation Run: Corn Field"
    print("[PASS] Authoritative calculated metrics & Recharts datasets verified for Alice")

    # 6. Farm Filter & Cross-Tenant Security Check
    dash_farm_a = client.get(f"/api/dashboard/analytics?farm_id={farm_a_id}", headers=headers_a)
    assert dash_farm_a.status_code == 200
    assert dash_farm_a.json()["selected_farm_name"] == "Alice Green Acres"

    # Alice attempts to filter by Bob's farm (Cross-tenant IDOR attack)
    dash_idor = client.get(f"/api/dashboard/analytics?farm_id={farm_b_id}", headers=headers_a)
    assert dash_idor.status_code == 404, f"Expected 404 IDOR, got {dash_idor.status_code}"
    print("[PASS] Farm filtering and cross-user IDOR access rejection verified (HTTP 404)")

    # 7. Date Range Filtering & Validation
    # Filter only 2026-10-01 to 2026-10-03 (Includes only seed expense 15,000, 0 sales, 0 harvest)
    dash_date_filt = client.get(
        "/api/dashboard/analytics?start_date=2026-10-01&end_date=2026-10-03",
        headers=headers_a,
    )
    assert dash_date_filt.status_code == 200
    d_filt = dash_date_filt.json()
    assert float(d_filt["kpi"]["total_expenses"]) == 15000.0
    assert float(d_filt["kpi"]["total_sales_revenue"]) == 0.0
    assert float(d_filt["kpi"]["net_profit_loss"]) == -15000.0
    assert d_filt["kpi"]["is_profit"] is False

    # Invalid date range: start_date > end_date
    invalid_date = client.get(
        "/api/dashboard/analytics?start_date=2026-10-31&end_date=2026-10-01",
        headers=headers_a,
    )
    assert invalid_date.status_code == 400
    print("[PASS] Date filtering and invalid date range rejection (HTTP 400) verified")

    # 8. Tenant Isolation: Bob's Clean Dashboard
    dash_b = client.get("/api/dashboard/analytics", headers=headers_b)
    assert dash_b.status_code == 200
    b_kpi = dash_b.json()["kpi"]
    assert b_kpi["total_farms"] == 1
    assert b_kpi["total_fields"] == 0
    assert b_kpi["total_crops"] == 0
    assert float(b_kpi["total_sales_revenue"]) == 0.0
    assert float(b_kpi["total_expenses"]) == 0.0
    assert float(b_kpi["net_profit_loss"]) == 0.0
    assert len(dash_b.json()["income_expense_trend"]) == 0
    assert len(dash_b.json()["crop_distribution"]) == 0
    print("[PASS] Tenant Bob data isolation verified (zero bleed from Tenant Alice)")

    # 9. Modular Sub-Endpoints Verification
    assert client.get("/api/dashboard/summary", headers=headers_a).status_code == 200
    assert client.get("/api/dashboard/financial-overview", headers=headers_a).status_code == 200
    assert client.get("/api/dashboard/income-expense-trend", headers=headers_a).status_code == 200
    assert client.get("/api/dashboard/expense-breakdown", headers=headers_a).status_code == 200
    assert client.get("/api/dashboard/attendance-trend", headers=headers_a).status_code == 200
    assert client.get("/api/dashboard/crop-distribution", headers=headers_a).status_code == 200
    assert client.get("/api/dashboard/harvest-trend", headers=headers_a).status_code == 200
    assert client.get("/api/dashboard/upcoming-activities", headers=headers_a).status_code == 200
    print("[PASS] All modular sub-endpoints (/summary, /financial-overview, /trends...) verified")

    print("=" * 65)
    print(" ALL 9 PHASE 17 DASHBOARD ANALYTICS TESTS PASSED (100%)")
    print("=" * 65)


if __name__ == "__main__":
    run_tests()
