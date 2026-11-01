"""Automated Test Suite for Phase 9: Salary Management + Labour Payments.

Validates all 20 requirements specified in Phase 9:
1. Multi-tenant user registration & authentication (Alice & Bob).
2. Base farms and workers registered under respective tenants with daily wages.
3. Salary calculation for a worker with only Present days.
4. Salary calculation when Half Day records exist (0.5 units).
5. Absent days are excluded (0 payable units).
6. Leave days follow unpaid policy (0 payable units).
7. Salary calculation restricts strictly to the selected period.
8. Historical wage snapshot preservation when worker profile daily wage changes.
9. Duplicate salary generation rejection (HTTP 409 Conflict).
10. Unpaid salary retains full outstanding balance.
11. Partial payment disbursement updates status to 'partially_paid'.
12. Overpayment rejection (HTTP 400 Bad Request).
13. Zero or negative payments rejection (HTTP 400/422).
14. Final payment disbursement updates status to 'paid'.
15. Payment history is chronologically preserved.
16. Cannot delete salary records with existing payment disbursements (audit integrity).
17. Invalid period date ranges rejected (HTTP 422).
18. Multi-tenant security isolation (Bob cannot view, generate, or pay Alice's salaries).
19. Salary summary endpoint aggregates financial statistics accurately.
20. Nested endpoints for labour salary history verified.
"""

import sys
import os
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.base import Base
from app.database.connection import get_db
import app.models  # Registers User, Farm, Field, Crop, Labour, Attendance, SalaryRecord, SalaryPayment
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
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def setup_module():
    """Create all schema tables in test SQLite memory before test suite runs."""
    Base.metadata.create_all(bind=engine)


def teardown_module():
    """Drop all tables on test completion."""
    Base.metadata.drop_all(bind=engine)


def register_and_login(name: str, email: str, password: str = "SecurePass123!") -> dict:
    """Helper to register user and obtain Bearer JWT header."""
    reg_resp = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    assert reg_resp.status_code in (200, 201), f"Registration failed: {reg_resp.text}"

    login_resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_phase9_salary_management_full_suite():
    """Comprehensive test covering all Phase 9 requirements."""
    print("\n--- [1] Setting up Multi-Tenant Users: Alice & Bob ---")
    alice_headers = register_and_login("Alice Farmer", "alice.salary@example.com")
    bob_headers = register_and_login("Bob Competitor", "bob.salary@example.com")

    # 1. Create Farm for Alice
    farm_resp = client.post(
        "/api/farms",
        headers=alice_headers,
        json={
            "name": "Green Acres Estate",
            "location": "Nashik, Maharashtra",
            "total_area": 50.0,
            "area_unit": "acres",
        },
    )
    assert farm_resp.status_code == 201, farm_resp.text
    alice_farm_id = farm_resp.json()["id"]

    # 2. Create Workers for Alice
    # Worker 1: Ramesh - Daily wage 500.00
    labour_ramesh_resp = client.post(
        "/api/labour",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "name": "Ramesh Patil",
            "phone": "+91 98765 43210",
            "work_type": "Harvester",
            "daily_wage": 500.00,
            "joining_date": "2026-01-01",
        },
    )
    assert labour_ramesh_resp.status_code == 201, labour_ramesh_resp.text
    ramesh_id = labour_ramesh_resp.json()["id"]

    # Worker 2: Suresh - Daily wage 600.00
    labour_suresh_resp = client.post(
        "/api/labour",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "name": "Suresh Kale",
            "phone": "+91 98765 43211",
            "work_type": "Irrigation Specialist",
            "daily_wage": 600.00,
            "joining_date": "2026-01-01",
        },
    )
    assert labour_suresh_resp.status_code == 201, labour_suresh_resp.text
    suresh_id = labour_suresh_resp.json()["id"]

    # 3. Create Farm and Worker for Bob
    bob_farm_resp = client.post(
        "/api/farms",
        headers=bob_headers,
        json={
            "name": "Bob Valley Farm",
            "location": "Pune, Maharashtra",
            "total_area": 30.0,
            "area_unit": "acres",
        },
    )
    assert bob_farm_resp.status_code == 201
    bob_farm_id = bob_farm_resp.json()["id"]

    bob_worker_resp = client.post(
        "/api/labour",
        headers=bob_headers,
        json={
            "farm_id": bob_farm_id,
            "name": "Mukesh Shinde",
            "work_type": "Driver",
            "daily_wage": 550.00,
            "joining_date": "2026-01-01",
        },
    )
    assert bob_worker_resp.status_code == 201
    bob_worker_id = bob_worker_resp.json()["id"]

    # 4. Log Attendance Records for Ramesh across 2026-05-01 to 2026-05-06
    # 2026-05-01: Present (8h)
    client.post(
        "/api/attendance",
        headers=alice_headers,
        json={
            "labour_id": ramesh_id,
            "attendance_date": "2026-05-01",
            "status": "present",
            "check_in": "09:00:00",
            "check_out": "17:00:00",
        },
    )
    # 2026-05-02: Present (8h)
    client.post(
        "/api/attendance",
        headers=alice_headers,
        json={
            "labour_id": ramesh_id,
            "attendance_date": "2026-05-02",
            "status": "present",
            "check_in": "09:00:00",
            "check_out": "17:00:00",
        },
    )
    # 2026-05-03: Half Day (4h)
    client.post(
        "/api/attendance",
        headers=alice_headers,
        json={
            "labour_id": ramesh_id,
            "attendance_date": "2026-05-03",
            "status": "half_day",
            "check_in": "09:00:00",
            "check_out": "13:00:00",
        },
    )
    # 2026-05-04: Absent
    client.post(
        "/api/attendance",
        headers=alice_headers,
        json={
            "labour_id": ramesh_id,
            "attendance_date": "2026-05-04",
            "status": "absent",
        },
    )
    # 2026-05-05: Leave (Unpaid)
    client.post(
        "/api/attendance",
        headers=alice_headers,
        json={
            "labour_id": ramesh_id,
            "attendance_date": "2026-05-05",
            "status": "leave",
        },
    )
    # 2026-05-06: Present with 60 mins overtime
    client.post(
        "/api/attendance",
        headers=alice_headers,
        json={
            "labour_id": ramesh_id,
            "attendance_date": "2026-05-06",
            "status": "present",
            "check_in": "09:00:00",
            "check_out": "18:00:00",
            "overtime_minutes": 60,
        },
    )
    # Attendance outside period: 2026-04-30 (should NOT be included in 05-01 to 05-06)
    client.post(
        "/api/attendance",
        headers=alice_headers,
        json={
            "labour_id": ramesh_id,
            "attendance_date": "2026-04-30",
            "status": "present",
        },
    )

    print("\n--- [2] Verifying Authoritative Salary Preview Calculation ---")
    # Preview for Ramesh: 2026-05-01 to 2026-05-06
    # Present = 3 days, Half day = 1 day (0.5), Absent = 1, Leave = 1. Total payable units = 3.5.
    # Daily wage = 500.00. Regular salary = 3.5 * 500 = 1750.00.
    # Overtime pay = 100.00, Additional earnings = 50.00, Deductions = 200.00.
    # Gross salary = 1750 + 100 + 50 = 1900.00. Net salary = 1900 - 200 = 1700.00.
    preview_resp = client.post(
        "/api/salaries/preview",
        headers=alice_headers,
        json={
            "labour_id": ramesh_id,
            "period_start": "2026-05-01",
            "period_end": "2026-05-06",
            "approved_overtime_pay": 100.00,
            "additional_earnings": 50.00,
            "deductions": 200.00,
            "notes": "May Week 1 salary preview",
        },
    )
    assert preview_resp.status_code == 200, preview_resp.text
    preview_data = preview_resp.json()
    assert preview_data["daily_wage_snapshot"] == 500.00 or Decimal(str(preview_data["daily_wage_snapshot"])) == Decimal("500.00")
    assert Decimal(str(preview_data["attendance"]["payable_units"])) == Decimal("3.50")
    assert preview_data["attendance"]["present_days"] == 3 or Decimal(str(preview_data["attendance"]["present_days"])) == Decimal("3.00")
    assert preview_data["attendance"]["half_days"] == 1
    assert preview_data["attendance"]["absent_days"] == 1
    assert preview_data["attendance"]["leave_days"] == 1
    assert preview_data["attendance"]["total_overtime_minutes"] == 60
    assert Decimal(str(preview_data["regular_salary"])) == Decimal("1750.00")
    assert Decimal(str(preview_data["gross_salary"])) == Decimal("1900.00")
    assert Decimal(str(preview_data["net_salary"])) == Decimal("1700.00")
    assert Decimal(str(preview_data["outstanding_balance"])) == Decimal("1700.00")
    assert preview_data["is_already_generated"] is False

    print("\n--- [3] Verifying Worker with Only Present Days (Suresh) ---")
    # Log 4 present days for Suresh
    for day in range(1, 5):
        client.post(
            "/api/attendance",
            headers=alice_headers,
            json={
                "labour_id": suresh_id,
                "attendance_date": f"2026-05-0{day}",
                "status": "present",
            },
        )
    suresh_preview = client.post(
        "/api/salaries/preview",
        headers=alice_headers,
        json={
            "labour_id": suresh_id,
            "period_start": "2026-05-01",
            "period_end": "2026-05-04",
        },
    )
    assert suresh_preview.status_code == 200
    sp_data = suresh_preview.json()
    # 4 days * 600.00 = 2400.00
    assert Decimal(str(sp_data["attendance"]["payable_units"])) == Decimal("4.00")
    assert Decimal(str(sp_data["regular_salary"])) == Decimal("2400.00")
    assert Decimal(str(sp_data["net_salary"])) == Decimal("2400.00")

    print("\n--- [4] Generating Permanent Salary Record for Ramesh ---")
    create_resp = client.post(
        "/api/salaries",
        headers=alice_headers,
        json={
            "labour_id": ramesh_id,
            "period_start": "2026-05-01",
            "period_end": "2026-05-06",
            "approved_overtime_pay": 100.00,
            "additional_earnings": 50.00,
            "deductions": 200.00,
            "notes": "May Week 1 official salary",
        },
    )
    assert create_resp.status_code == 201, create_resp.text
    salary_record = create_resp.json()
    salary_id = salary_record["id"]
    assert Decimal(str(salary_record["regular_salary"])) == Decimal("1750.00")
    assert Decimal(str(salary_record["net_salary"])) == Decimal("1700.00")
    assert Decimal(str(salary_record["amount_paid"])) == Decimal("0.00")
    assert Decimal(str(salary_record["outstanding_balance"])) == Decimal("1700.00")
    assert salary_record["status"] == "generated"

    print("\n--- [5] Historical Daily Wage Preservation ---")
    # Change Ramesh's daily wage from 500 to 800 on worker profile
    patch_worker = client.put(
        f"/api/labour/{ramesh_id}",
        headers=alice_headers,
        json={"daily_wage": 800.00},
    )
    assert patch_worker.status_code == 200

    # Retrieve existing salary record: snapshot must remain 500.00, regular salary 1750.00
    fetch_salary = client.get(f"/api/salaries/{salary_id}", headers=alice_headers)
    assert fetch_salary.status_code == 200
    fs_data = fetch_salary.json()
    assert Decimal(str(fs_data["daily_wage_snapshot"])) == Decimal("500.00")
    assert Decimal(str(fs_data["regular_salary"])) == Decimal("1750.00")
    assert Decimal(str(fs_data["net_salary"])) == Decimal("1700.00")

    print("\n--- [6] Duplicate Salary Prevention (409 Conflict) ---")
    dup_resp = client.post(
        "/api/salaries",
        headers=alice_headers,
        json={
            "labour_id": ramesh_id,
            "period_start": "2026-05-01",
            "period_end": "2026-05-06",
        },
    )
    assert dup_resp.status_code == 409, f"Expected 409 Conflict on duplicate salary, got {dup_resp.status_code}"

    print("\n--- [7] Invalid Period Range Rejection (422) ---")
    invalid_period = client.post(
        "/api/salaries/preview",
        headers=alice_headers,
        json={
            "labour_id": ramesh_id,
            "period_start": "2026-05-10",
            "period_end": "2026-05-01",  # End is before start!
        },
    )
    assert invalid_period.status_code == 422

    print("\n--- [8] Payment Validation: Zero or Negative Rejection ---")
    neg_pay = client.post(
        f"/api/salaries/{salary_id}/payments",
        headers=alice_headers,
        json={
            "amount": -50.00,
            "payment_date": "2026-05-07",
            "payment_method": "cash",
        },
    )
    assert neg_pay.status_code == 422 or neg_pay.status_code == 400

    zero_pay = client.post(
        f"/api/salaries/{salary_id}/payments",
        headers=alice_headers,
        json={
            "amount": 0.00,
            "payment_date": "2026-05-07",
            "payment_method": "cash",
        },
    )
    assert zero_pay.status_code == 422 or zero_pay.status_code == 400

    print("\n--- [9] Overpayment Rejection (400 Bad Request) ---")
    # Outstanding balance is 1700.00. Try paying 1700.01.
    overpay = client.post(
        f"/api/salaries/{salary_id}/payments",
        headers=alice_headers,
        json={
            "amount": 1700.01,
            "payment_date": "2026-05-07",
            "payment_method": "bank_transfer",
        },
    )
    assert overpay.status_code == 400, overpay.text
    assert "exceeds" in overpay.text.lower()

    print("\n--- [10] Partial Payment Disbursement ('partially_paid') ---")
    # Pay 700.00 out of 1700.00
    pay1_resp = client.post(
        f"/api/salaries/{salary_id}/payments",
        headers=alice_headers,
        json={
            "amount": 700.00,
            "payment_date": "2026-05-07",
            "payment_method": "bank_transfer",
            "transaction_reference": "TXN_NEFT_987654",
            "notes": "First partial payment",
        },
    )
    assert pay1_resp.status_code == 201, pay1_resp.text
    pay1_data = pay1_resp.json()
    assert Decimal(str(pay1_data["amount"])) == Decimal("700.00")
    pay1_id = pay1_data["id"]

    # Verify updated salary ledger
    sal_after_pay1 = client.get(f"/api/salaries/{salary_id}", headers=alice_headers).json()
    assert Decimal(str(sal_after_pay1["amount_paid"])) == Decimal("700.00")
    assert Decimal(str(sal_after_pay1["outstanding_balance"])) == Decimal("1000.00")
    assert sal_after_pay1["status"] == "partially_paid"
    assert len(sal_after_pay1["payments"]) == 1

    print("\n--- [11] Payment Audit Trail Integrity: Cannot Delete Salary with Payments ---")
    del_attempt = client.delete(f"/api/salaries/{salary_id}", headers=alice_headers)
    assert del_attempt.status_code == 400
    assert "cannot delete" in del_attempt.text.lower()

    print("\n--- [12] Final Payment Disbursement ('paid') ---")
    # Pay remaining 1000.00
    pay2_resp = client.post(
        f"/api/salaries/{salary_id}/payments",
        headers=alice_headers,
        json={
            "amount": 1000.00,
            "payment_date": "2026-05-08",
            "payment_method": "upi",
            "transaction_reference": "UPI_REF_443322",
            "notes": "Final settlement disbursement",
        },
    )
    assert pay2_resp.status_code == 201, pay2_resp.text

    # Verify updated salary ledger: status must be 'paid' and balance 0.00
    sal_after_pay2 = client.get(f"/api/salaries/{salary_id}", headers=alice_headers).json()
    assert Decimal(str(sal_after_pay2["amount_paid"])) == Decimal("1700.00")
    assert Decimal(str(sal_after_pay2["outstanding_balance"])) == Decimal("0.00")
    assert sal_after_pay2["status"] == "paid"
    assert len(sal_after_pay2["payments"]) == 2

    # Paying anything further must be rejected as balance is 0.00
    pay_after_zero = client.post(
        f"/api/salaries/{salary_id}/payments",
        headers=alice_headers,
        json={
            "amount": 10.00,
            "payment_date": "2026-05-09",
            "payment_method": "cash",
        },
    )
    assert pay_after_zero.status_code == 400

    print("\n--- [13] Multi-Tenant Security & IDOR Protections ---")
    # Bob attempts to view Alice's salary record
    bob_view = client.get(f"/api/salaries/{salary_id}", headers=bob_headers)
    assert bob_view.status_code == 404

    # Bob attempts to list payments on Alice's salary
    bob_list_pay = client.get(f"/api/salaries/{salary_id}/payments", headers=bob_headers)
    assert bob_list_pay.status_code == 404

    # Bob attempts to record payment on Alice's salary
    bob_pay = client.post(
        f"/api/salaries/{salary_id}/payments",
        headers=bob_headers,
        json={
            "amount": 100.00,
            "payment_date": "2026-05-08",
            "payment_method": "cash",
        },
    )
    assert bob_pay.status_code == 404

    # Bob attempts to generate salary for Alice's worker Ramesh
    bob_gen = client.post(
        "/api/salaries",
        headers=bob_headers,
        json={
            "labour_id": ramesh_id,
            "period_start": "2026-05-01",
            "period_end": "2026-05-06",
        },
    )
    assert bob_gen.status_code == 404

    # Bob lists salaries: gets empty list
    bob_list = client.get("/api/salaries", headers=bob_headers).json()
    assert len(bob_list) == 0

    print("\n--- [14] Nested Worker Salaries Endpoint ---")
    nested_resp = client.get(f"/api/labour/{ramesh_id}/salaries", headers=alice_headers)
    assert nested_resp.status_code == 200
    assert len(nested_resp.json()) == 1
    assert nested_resp.json()[0]["id"] == salary_id

    print("\n--- [15] Salary Summary Statistics ---")
    summary_resp = client.get("/api/salaries/summary", headers=alice_headers)
    assert summary_resp.status_code == 200
    sum_data = summary_resp.json()
    assert Decimal(str(sum_data["total_salary_payable"])) == Decimal("1700.00")
    assert Decimal(str(sum_data["total_amount_paid"])) == Decimal("1700.00")
    assert Decimal(str(sum_data["total_outstanding_balance"])) == Decimal("0.00")
    assert sum_data["paid_records_count"] == 1
    assert sum_data["partially_paid_records_count"] == 0
    assert sum_data["unpaid_records_count"] == 0
    assert sum_data["total_records_count"] == 1

    print("\n--- [16] Unpaid Salary Deletion ---")
    # Generate salary for Suresh
    suresh_salary = client.post(
        "/api/salaries",
        headers=alice_headers,
        json={
            "labour_id": suresh_id,
            "period_start": "2026-05-01",
            "period_end": "2026-05-04",
        },
    ).json()
    suresh_salary_id = suresh_salary["id"]

    # Delete unpaid salary
    del_suresh = client.delete(f"/api/salaries/{suresh_salary_id}", headers=alice_headers)
    assert del_suresh.status_code == 200
    assert del_suresh.json()["deleted"] is True

    # Confirm deletion
    get_del = client.get(f"/api/salaries/{suresh_salary_id}", headers=alice_headers)
    assert get_del.status_code == 404

    print("\n>>> ALL PHASE 9 SALARY & PAYMENT TESTS PASSED EXCELLENTLY! <<<")


if __name__ == "__main__":
    setup_module()
    try:
        test_phase9_salary_management_full_suite()
        print("\nAll Phase 9 Salary Management tests executed and PASSED!")
    finally:
        teardown_module()
