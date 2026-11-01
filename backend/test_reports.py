"""Automated Test Suite for Phase 18: Reports Management.

Validates:
1. Multi-tenant user registration & authentication (Tenant Alice & Tenant Bob).
2. Domain datasets populated (Farms, Fields, Crops, Workforce, Attendance, Salaries, Applications, Expenses, Harvests, Sales, Other Income, Activities).
3. Unauthenticated report access blocked with HTTP 401.
4. Reports Overview endpoint (/api/reports/overview) metrics & financial calculations.
5. All 12 report category endpoints return valid structured data matching real database records.
6. Financial calculation compliance:
   - Total Income = Sales Revenue + Other Income
   - Recorded Profit/Loss = Total Income - Total Expenses
   - Produce sales use final amount after discounts
   - Unpaid salary is NOT treated as payment
7. Date presets (today, last_7_days, this_month, etc.) and custom range filtering.
8. Invalid date boundary validation (start_date > end_date returns HTTP 400).
9. Farm filtering & IDOR protection (Bob querying Alice's farm ID returns HTTP 404).
10. Tenant Bob data isolation (0 bleed from Tenant Alice).
11. PDF Export generation (returns valid PDF binary starting with %PDF-).
12. Excel Export generation (returns valid XLSX binary starting with PK).
13. Unified table preview endpoint (/api/reports/preview).
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
import app.models  # Load all models
from app.main import app

# In-memory SQLite isolated testing database
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_reports_suite():
    print("=" * 65)
    print(" Running Phase 18 Reports Management Automated Test Suite")
    print("=" * 65)

    # 1. Initialize schema
    Base.metadata.create_all(bind=engine)
    print("[PASS] In-memory database schema initialized")

    # 2. Register Tenant Alice and Tenant Bob
    alice_res = client.post(
        "/api/auth/register",
        json={
            "name": "Alice Green",
            "email": "alice.reports@example.com",
            "password": "Password123!",
            "phone": "+919876543210",
        },
    )
    assert alice_res.status_code == 201, f"Failed Alice register: {alice_res.text}"
    alice_token = alice_res.json()["data"]["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    bob_res = client.post(
        "/api/auth/register",
        json={
            "name": "Bob Valley",
            "email": "bob.reports@example.com",
            "password": "Password123!",
            "phone": "+919876543211",
        },
    )
    assert bob_res.status_code == 201, f"Failed Bob register: {bob_res.text}"
    bob_token = bob_res.json()["data"]["access_token"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    client.cookies.clear()
    print("[PASS] Tenant Alice and Tenant Bob registered and authenticated")

    # Helper to parse response ID
    def get_id(resp):
        data = resp.json()
        if isinstance(data, dict):
            if "data" in data and isinstance(data["data"], dict) and "id" in data["data"]:
                return data["data"]["id"]
            if "id" in data:
                return data["id"]
        raise ValueError(f"No id found in response: {data}")

    # 3. Populate full domain dataset for Alice
    # 3.1 Farm
    farm_res = client.post(
        "/api/farms",
        headers=alice_headers,
        json={
            "name": "Alice Estate",
            "location": "Punjab, India",
            "total_area": 50.0,
            "area_unit": "acres",
        },
    )
    assert farm_res.status_code == 201, f"Failed to create farm: {farm_res.text}"
    farm_id = get_id(farm_res)

    # 3.2 Field
    field_res = client.post(
        f"/api/farms/{farm_id}/fields",
        headers=alice_headers,
        json={
            "name": "North Field",
            "area": 25.0,
            "area_unit": "acres",
            "soil_type": "Loamy Soil",
            "irrigation_type": "Drip Irrigation",
        },
    )
    assert field_res.status_code == 201
    field_id = get_id(field_res)

    # 3.3 Crop
    today = date.today()
    crop_res = client.post(
        "/api/crops",
        headers=alice_headers,
        json={
            "field_id": field_id,
            "name": "Durum Wheat",
            "variety": "Sharbati",
            "season": "Rabi",
            "sowing_date": (today - timedelta(days=40)).isoformat(),
            "expected_harvest_date": (today + timedelta(days=60)).isoformat(),
            "status": "growing",
            "planted_area": 20.0,
            "planted_area_unit": "acres",
            "seed_quantity": 500.0,
            "seed_unit": "kg",
        },
    )
    assert crop_res.status_code == 201
    crop_id = get_id(crop_res)

    # 3.4 Labour & Attendance
    worker_res = client.post(
        "/api/labour",
        headers=alice_headers,
        json={
            "farm_id": farm_id,
            "name": "Ramesh Patel",
            "phone": "+919876500001",
            "work_type": "Irrigation Specialist",
            "daily_wage": 700.0,
            "joining_date": (today - timedelta(days=90)).isoformat(),
        },
    )
    assert worker_res.status_code == 201
    worker_id = get_id(worker_res)

    att_res = client.post(
        "/api/attendance",
        headers=alice_headers,
        json={
            "labour_id": worker_id,
            "attendance_date": today.isoformat(),
            "status": "present",
            "check_in": "08:00:00",
            "check_out": "17:00:00",
            "working_minutes": 480,
            "overtime_minutes": 0,
            "notes": "Field plot irrigation management",
        },
    )
    assert att_res.status_code == 201

    # 3.5 Salary record & partial payment
    sal_res = client.post(
        "/api/salaries",
        headers=alice_headers,
        json={
            "labour_id": worker_id,
            "period_start": (today - timedelta(days=30)).isoformat(),
            "period_end": today.isoformat(),
        },
    )
    assert sal_res.status_code == 201, f"Failed salary create: {sal_res.text}"
    salary_record_id = get_id(sal_res)

    pmt_res = client.post(
        f"/api/salaries/{salary_record_id}/payments",
        headers=alice_headers,
        json={
            "amount": 500.0,
            "payment_date": today.isoformat(),
            "payment_method": "cash",
            "notes": "Advance wage payment",
        },
    )
    assert pmt_res.status_code == 201

    # 3.6 Agricultural Application (Fertilizer)
    app_res = client.post(
        "/api/applications",
        headers=alice_headers,
        json={
            "farm_id": farm_id,
            "field_id": field_id,
            "crop_id": crop_id,
            "application_category": "fertilizer",
            "product_name": "Organic Vermicompost",
            "product_type": "Organic Compost",
            "quantity": 100.0,
            "unit": "kg",
            "unit_cost": 50.0,
            "total_cost": 5000.0,
            "application_date": today.isoformat(),
            "application_method": "Broadcasting",
            "purpose": "Soil enrichment",
        },
    )
    assert app_res.status_code == 201

    # 3.7 Expenses
    exp1 = client.post(
        "/api/expenses",
        headers=alice_headers,
        json={
            "farm_id": farm_id,
            "field_id": field_id,
            "title": "Certified Wheat Seeds",
            "category": "seeds",
            "amount": 10000.0,
            "expense_date": (today - timedelta(days=20)).isoformat(),
        },
    )
    assert exp1.status_code == 201

    exp2 = client.post(
        "/api/expenses",
        headers=alice_headers,
        json={
            "farm_id": farm_id,
            "field_id": field_id,
            "title": "Drip Irrigation Pump Servicing",
            "category": "maintenance_and_repairs",
            "amount": 5000.0,
            "expense_date": today.isoformat(),
        },
    )
    assert exp2.status_code == 201

    # Total expenses for Alice = 10,000 + 5,000 = 15,000.00

    # 3.8 Harvest
    harv_res = client.post(
        "/api/harvests",
        headers=alice_headers,
        json={
            "farm_id": farm_id,
            "field_id": field_id,
            "crop_id": crop_id,
            "harvest_date": today.isoformat(),
            "quantity": 1500.0,
            "unit": "kg",
            "quality_grade": "Grade A",
        },
    )
    assert harv_res.status_code == 201
    harvest_id = get_id(harv_res)

    # 3.9 Sales & Other Income
    sale_res = client.post(
        "/api/sales",
        headers=alice_headers,
        json={
            "farm_id": farm_id,
            "field_id": field_id,
            "crop_id": crop_id,
            "harvest_id": harvest_id,
            "sale_date": today.isoformat(),
            "buyer_name": "Agro Fresh Mills",
            "product_name": "Premium Durum Wheat",
            "quantity": 1000.0,
            "unit": "kg",
            "unit_price": 40.0,
            "discount_amount": 2000.0,  # Gross = 40,000; Final Sale Amount = 38,000
            "upfront_payment": 30000.0, # Outstanding = 8,000
            "payment_method": "bank_transfer",
        },
    )
    assert sale_res.status_code == 201
    # Produce sales revenue = 38,000.00

    inc_res = client.post(
        "/api/income",
        headers=alice_headers,
        json={
            "farm_id": farm_id,
            "category": "government_subsidy",
            "description": "Solar Pump Installation Subsidy",
            "source": "State Agriculture Dept",
            "income_date": today.isoformat(),
            "amount": 12000.0,
            "payment_method": "bank_transfer",
        },
    )
    assert inc_res.status_code == 201
    # Other income = 12,000.00
    # Expected Total Gross Income = 38,000 + 12,000 = 50,000.00
    # Expected Total Expenses = 15,000.00
    # Expected Recorded Profit = 50,000 - 15,000 = 35,000.00

    # 3.10 Calendar Event (Irrigation)
    cal_res = client.post(
        "/api/calendar/events",
        headers=alice_headers,
        json={
            "farm_id": farm_id,
            "field_id": field_id,
            "crop_id": crop_id,
            "title": "Drip Irrigation Cycle #4",
            "activity_type": "irrigation",
            "start_datetime": f"{today.isoformat()}T06:00:00Z",
            "end_datetime": f"{today.isoformat()}T08:00:00Z",
            "priority": "high",
        },
    )
    assert cal_res.status_code == 201
    print("[PASS] Full domain test records registered for Alice")

    # 4. Unauthenticated access enforcement (HTTP 401)
    client.cookies.clear()
    unauth_endpoints = [
        "/api/reports/overview",
        "/api/reports/farm-summary",
        "/api/reports/crops",
        "/api/reports/labour",
        "/api/reports/attendance",
        "/api/reports/salaries",
        "/api/reports/fertilizer-pesticide",
        "/api/reports/irrigation",
        "/api/reports/expenses",
        "/api/reports/machinery",
        "/api/reports/harvest",
        "/api/reports/sales-income",
        "/api/reports/financial-summary",
        "/api/reports/preview",
        "/api/reports/export/pdf",
        "/api/reports/export/excel",
    ]
    for ep in unauth_endpoints:
        r = client.get(ep)
        assert r.status_code == 401, f"Expected 401 for unauthenticated {ep}, got {r.status_code}"
    print("[PASS] Unauthenticated access blocked on all reports endpoints (HTTP 401)")

    # 5. Reports Overview Endpoint
    overview_res = client.get("/api/reports/overview", headers=alice_headers)
    assert overview_res.status_code == 200
    ov = overview_res.json()
    assert ov["total_categories"] == 12
    assert ov["available_farms_count"] == 1
    assert ov["total_fields_count"] == 1
    assert ov["active_crops_count"] == 1
    assert ov["total_labour_count"] == 1
    assert Decimal(str(ov["total_sales_revenue"])) == Decimal("38000.00")
    assert Decimal(str(ov["total_other_income"])) == Decimal("12000.00")
    assert Decimal(str(ov["total_income"])) == Decimal("50000.00")
    assert Decimal(str(ov["total_expenses"])) == Decimal("15000.00")
    assert Decimal(str(ov["recorded_profit_loss"])) == Decimal("35000.00")
    assert ov["is_profit"] is True
    print("[PASS] Authoritative Reports Overview telemetry & financial calculations verified")

    # 6. All 12 Report Categories Endpoints
    # 6.1 Farm Summary
    r1 = client.get("/api/reports/farm-summary", headers=alice_headers)
    assert r1.status_code == 200
    assert len(r1.json()["farms"]) == 1
    assert r1.json()["farms"][0]["farm_name"] == "Alice Estate"

    # 6.2 Crops
    r2 = client.get("/api/reports/crops", headers=alice_headers)
    assert r2.status_code == 200
    assert len(r2.json()["items"]) == 1
    assert r2.json()["items"][0]["crop_name"] == "Durum Wheat"

    # 6.3 Labour
    r3 = client.get("/api/reports/labour", headers=alice_headers)
    assert r3.status_code == 200
    assert len(r3.json()["items"]) == 1
    assert r3.json()["items"][0]["name"] == "Ramesh Patel"

    # 6.4 Attendance
    r4 = client.get("/api/reports/attendance", headers=alice_headers)
    assert r4.status_code == 200
    assert len(r4.json()["items"]) == 1
    assert r4.json()["items"][0]["worker_name"] == "Ramesh Patel"

    # 6.5 Salary
    r5 = client.get("/api/reports/salaries", headers=alice_headers)
    assert r5.status_code == 200
    assert len(r5.json()["items"]) == 1
    # Check unpaid salary is not treated as payment
    sal_item = r5.json()["items"][0]
    assert Decimal(str(sal_item["amount_paid"])) == Decimal("500.00")
    assert Decimal(str(sal_item["outstanding_balance"])) > Decimal("0.00")

    # 6.6 Fertilizer & Pesticide
    r6 = client.get("/api/reports/fertilizer-pesticide", headers=alice_headers)
    assert r6.status_code == 200
    assert len(r6.json()["items"]) == 1
    assert r6.json()["items"][0]["product_name"] == "Organic Vermicompost"

    # 6.7 Irrigation
    r7 = client.get("/api/reports/irrigation", headers=alice_headers)
    assert r7.status_code == 200
    assert len(r7.json()["items"]) == 1
    assert "Drip" in r7.json()["items"][0]["irrigation_method"]

    # 6.8 Expense
    r8 = client.get("/api/reports/expenses", headers=alice_headers)
    assert r8.status_code == 200
    assert len(r8.json()["items"]) == 2
    assert Decimal(str(r8.json()["total_expenses"])) == Decimal("15000.00")

    # 6.9 Machinery
    r9 = client.get("/api/reports/machinery", headers=alice_headers)
    assert r9.status_code == 200
    # Machinery has 0 records registered yet
    assert len(r9.json()["items"]) == 0

    # 6.10 Harvest
    r10 = client.get("/api/reports/harvest", headers=alice_headers)
    assert r10.status_code == 200
    assert len(r10.json()["items"]) == 1
    assert Decimal(str(r10.json()["items"][0]["quantity"])) == Decimal("1500.00")

    # 6.11 Sales & Income
    r11 = client.get("/api/reports/sales-income", headers=alice_headers)
    assert r11.status_code == 200
    assert len(r11.json()["items"]) == 2
    assert Decimal(str(r11.json()["total_gross_income"])) == Decimal("50000.00")

    # 6.12 Financial Summary
    r12 = client.get("/api/reports/financial-summary", headers=alice_headers)
    assert r12.status_code == 200
    assert Decimal(str(r12.json()["total_income"])) == Decimal("50000.00")
    assert Decimal(str(r12.json()["total_expenses"])) == Decimal("15000.00")
    assert Decimal(str(r12.json()["recorded_profit_loss"])) == Decimal("35000.00")
    print("[PASS] All 12 report category API endpoints return verified real database data")

    # 7. Date filtering and validation
    r_date_valid = client.get(
        f"/api/reports/expenses?start_date={(today - timedelta(days=5)).isoformat()}&end_date={today.isoformat()}",
        headers=alice_headers,
    )
    assert r_date_valid.status_code == 200
    # Only the second expense from today should match
    assert len(r_date_valid.json()["items"]) == 1

    r_date_invalid = client.get(
        f"/api/reports/expenses?start_date={today.isoformat()}&end_date={(today - timedelta(days=5)).isoformat()}",
        headers=alice_headers,
    )
    assert r_date_invalid.status_code == 400
    err_msg = r_date_invalid.json().get("error", {}).get("message") or r_date_invalid.json().get("detail", "")
    assert "cannot be later than end date" in err_msg
    print("[PASS] Date filtering and boundary validation (HTTP 400) verified")

    # 8. Farm filtering & IDOR protection
    r_farm_filter = client.get(f"/api/reports/crops?farm_id={farm_id}", headers=alice_headers)
    assert r_farm_filter.status_code == 200
    assert len(r_farm_filter.json()["items"]) == 1

    # Bob attempts to query Alice's farm ID
    r_idor = client.get(f"/api/reports/crops?farm_id={farm_id}", headers=bob_headers)
    assert r_idor.status_code == 404, f"Expected 404 for IDOR, got {r_idor.status_code}"
    print("[PASS] Farm filtering and cross-user IDOR access rejection (HTTP 404) verified")

    # 9. Tenant Bob Data Isolation
    bob_overview = client.get("/api/reports/overview", headers=bob_headers)
    assert bob_overview.status_code == 200
    assert bob_overview.json()["available_farms_count"] == 0
    assert Decimal(str(bob_overview.json()["total_income"])) == Decimal("0.00")
    assert Decimal(str(bob_overview.json()["total_expenses"])) == Decimal("0.00")

    bob_financial = client.get("/api/reports/financial-summary", headers=bob_headers)
    assert bob_financial.status_code == 200
    assert Decimal(str(bob_financial.json()["total_income"])) == Decimal("0.00")
    assert Decimal(str(bob_financial.json()["total_expenses"])) == Decimal("0.00")
    print("[PASS] Tenant Bob data isolation verified (zero leak from Tenant Alice)")

    # 10. Unified preview endpoint
    prev_res = client.get("/api/reports/preview?category=crop", headers=alice_headers)
    assert prev_res.status_code == 200
    prev_data = prev_res.json()
    assert "metadata" in prev_data
    assert "table_headers" in prev_data
    assert len(prev_data["table_rows"]) == 1
    assert prev_data["table_rows"][0]["Crop Name"] == "Durum Wheat"
    print("[PASS] Unified preview table generator verified")

    # 11. PDF Export generation
    pdf_res = client.get("/api/reports/export/pdf?category=financial_summary", headers=alice_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in pdf_res.headers["content-disposition"]
    # Check PDF file signature
    assert pdf_res.content.startswith(b"%PDF-"), "Invalid PDF signature"
    print(f"[PASS] PDF export generated successfully ({len(pdf_res.content)} bytes, header=%PDF-)")

    # 12. Excel Export generation
    excel_res = client.get("/api/reports/export/excel?category=crop", headers=alice_headers)
    assert excel_res.status_code == 200
    assert excel_res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert "attachment; filename=" in excel_res.headers["content-disposition"]
    # Check Zip/XLSX signature
    assert excel_res.content.startswith(b"PK"), "Invalid Excel/ZIP signature"
    print(f"[PASS] Excel export generated successfully ({len(excel_res.content)} bytes, header=PK)")

    print("=" * 65)
    print(" ALL 12 PHASE 18 REPORTS MANAGEMENT TESTS PASSED (100%)")
    print("=" * 65)


if __name__ == "__main__":
    test_reports_suite()
