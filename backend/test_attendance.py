"""Automated Test Suite for Phase 8: Attendance Management + Working Hours Calculation.

Validates:
1. Multi-tenant user registration & authentication (Alice & Bob).
2. Base farms and workers registered under respective tenants.
3. Unauthenticated attendance operations strictly blocked (401).
4. Cross-user worker attendance creation strictly blocked (404/unauthorized).
5. Working hours calculations:
   - 09:00 to 17:00 = 8 hours (480 mins)
   - 09:00 to 17:30 = 8 hours 30 mins (510 mins)
   - 09:00 to 13:00 = 4 hours (240 mins)
   - Overnight shift (21:00 to 05:00) = 8 hours (480 mins)
6. Attendance statuses:
   - 'present': full working hours calculated.
   - 'absent': working minutes forced to 0, overtime to 0.
   - 'half_day': calculated working hours (or 240 mins default).
   - 'leave': working minutes forced to 0, overtime to 0.
7. Business rule validations:
   - Negative overtime rejected (422).
   - Overtime exceeding working duration rejected (422).
   - Invalid status rejected (422).
8. Duplicate prevention:
   - Duplicate attendance for same worker on same date rejected (409 Conflict).
9. Bulk attendance submission:
   - Bulk sheet logs multiple workers for a date simultaneously.
   - Upsert updates existing record without duplicate key error.
10. Multi-tenant security isolation:
   - Bob cannot list, view, update, or delete Alice's worker attendance.
11. Attendance updates & corrections:
   - PUT /api/attendance/{id} updates times and recalculates working hours.
12. Attendance deletion:
   - DELETE /api/attendance/{id} removes record with ownership verification.
13. Daily summary and statistics:
   - GET /api/attendance/summary accurately aggregates present, absent, half-day, leave, unmarked, and total hours.
14. Nested endpoint verification:
   - GET /api/labour/{labour_id}/attendance
   - POST /api/labour/{labour_id}/attendance
"""

import sys
import os
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.base import Base
from app.database.connection import get_db
import app.models  # Register User, Farm, Field, Crop, Labour, Attendance
from app.main import app

# In-memory SQLite isolated testing database
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def run_tests():
    print("=" * 70)
    print(" Running Phase 8 Attendance & Working Hours Automated Tests")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. Setup multi-tenant test accounts
    # -------------------------------------------------------------
    alice_reg = client.post(
        "/api/auth/register",
        json={
            "name": "Alice Estate Supervisor",
            "email": "alice.attendance@agricore.com",
            "password": "Password123!",
            "phone": "+91 9876543230",
        },
    )
    assert alice_reg.status_code == 201, f"Alice registration failed: {alice_reg.text}"
    alice_token = alice_reg.json()["data"]["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    bob_reg = client.post(
        "/api/auth/register",
        json={
            "name": "Bob Field Manager",
            "email": "bob.attendance@agricore.com",
            "password": "Password123!",
            "phone": "+91 9876543231",
        },
    )
    assert bob_reg.status_code == 201, f"Bob registration failed: {bob_reg.text}"
    bob_token = bob_reg.json()["data"]["access_token"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}
    client.cookies.clear()

    print(" [PASS] 1. Multi-Tenant Accounts Registered & Authenticated")

    # -------------------------------------------------------------
    # 2. Setup Base Farms & Labour
    # -------------------------------------------------------------
    alice_farm = client.post(
        "/api/farms",
        json={
            "name": "Green Meadows Farm",
            "location": "Punjab, Sector 9",
            "total_area": 100.0,
            "area_unit": "acres",
        },
        headers=alice_headers,
    ).json()
    alice_farm_id = alice_farm["id"]

    bob_farm = client.post(
        "/api/farms",
        json={
            "name": "Golden Harvest Estate",
            "location": "Haryana, Block 3",
            "total_area": 50.0,
            "area_unit": "acres",
        },
        headers=bob_headers,
    ).json()
    bob_farm_id = bob_farm["id"]

    # Alice's workers
    worker_1 = client.post(
        "/api/labour",
        json={
            "farm_id": alice_farm_id,
            "name": "Rahul Verma",
            "work_type": "Tractor Operator",
            "daily_wage": 600.0,
            "joining_date": "2026-01-01",
        },
        headers=alice_headers,
    ).json()
    w1_id = worker_1["id"]

    worker_2 = client.post(
        "/api/labour",
        json={
            "farm_id": alice_farm_id,
            "name": "Suresh Kumar",
            "work_type": "Irrigation Worker",
            "daily_wage": 500.0,
            "joining_date": "2026-01-01",
        },
        headers=alice_headers,
    ).json()
    w2_id = worker_2["id"]

    worker_3 = client.post(
        "/api/labour",
        json={
            "farm_id": alice_farm_id,
            "name": "Amit Singh",
            "work_type": "General Labour",
            "daily_wage": 450.0,
            "joining_date": "2026-01-01",
        },
        headers=alice_headers,
    ).json()
    w3_id = worker_3["id"]

    # Bob's worker
    bob_worker = client.post(
        "/api/labour",
        json={
            "farm_id": bob_farm_id,
            "name": "Dinesh Patel",
            "work_type": "Harvester",
            "daily_wage": 550.0,
            "joining_date": "2026-01-01",
        },
        headers=bob_headers,
    ).json()
    bob_worker_id = bob_worker["id"]

    print(" [PASS] 2. Base Farms & Workers Created")

    # -------------------------------------------------------------
    # 3. Unauthenticated access blocked (401)
    # -------------------------------------------------------------
    unauth_list = client.get("/api/attendance")
    assert unauth_list.status_code == 401

    unauth_create = client.post(
        "/api/attendance",
        json={
            "labour_id": w1_id,
            "attendance_date": "2026-10-09",
            "status": "present",
        },
    )
    assert unauth_create.status_code == 401

    print(" [PASS] 3. Unauthenticated Attendance Access Strictly Blocked (401)")

    # -------------------------------------------------------------
    # 4. Cross-user worker attendance blocked (404)
    # -------------------------------------------------------------
    # Bob tries to log attendance for Alice's worker w1
    bob_spoof = client.post(
        "/api/attendance",
        json={
            "labour_id": w1_id,
            "attendance_date": "2026-10-09",
            "status": "present",
        },
        headers=bob_headers,
    )
    assert bob_spoof.status_code == 404, f"Expected 404, got {bob_spoof.status_code}"

    print(" [PASS] 4. Cross-User Worker Attendance Creation Blocked (404)")

    # -------------------------------------------------------------
    # 5. Working Hours Calculation Tests
    # -------------------------------------------------------------
    test_date = "2026-10-09"

    # Case A: 09:00 AM -> 05:00 PM = 8 hours (480 mins)
    res_a = client.post(
        "/api/attendance",
        json={
            "labour_id": w1_id,
            "attendance_date": test_date,
            "status": "present",
            "check_in": "09:00",
            "check_out": "17:00",
            "overtime_minutes": 0,
        },
        headers=alice_headers,
    )
    assert res_a.status_code == 201, f"Failed: {res_a.text}"
    data_a = res_a.json()
    assert data_a["working_minutes"] == 480, f"Expected 480 mins, got {data_a['working_minutes']}"
    assert data_a["working_hours_formatted"] == "8h"
    w1_att_id = data_a["id"]

    # Case B: 09:00 AM -> 05:30 PM = 8 hours 30 minutes (510 mins)
    res_b = client.post(
        "/api/attendance",
        json={
            "labour_id": w2_id,
            "attendance_date": test_date,
            "status": "present",
            "check_in": "09:00",
            "check_out": "17:30",
            "overtime_minutes": 30,
        },
        headers=alice_headers,
    )
    assert res_b.status_code == 201
    data_b = res_b.json()
    assert data_b["working_minutes"] == 510, f"Expected 510 mins, got {data_b['working_minutes']}"
    assert data_b["working_hours_formatted"] == "8h 30m"
    assert data_b["overtime_minutes"] == 30
    assert data_b["overtime_hours_formatted"] == "30m"
    w2_att_id = data_b["id"]

    # Case C: 09:00 AM -> 01:00 PM = 4 hours (240 mins) [Half Day]
    res_c = client.post(
        "/api/attendance",
        json={
            "labour_id": w3_id,
            "attendance_date": test_date,
            "status": "half_day",
            "check_in": "09:00",
            "check_out": "13:00",
        },
        headers=alice_headers,
    )
    assert res_c.status_code == 201
    data_c = res_c.json()
    assert data_c["working_minutes"] == 240
    assert data_c["working_hours_formatted"] == "4h"
    w3_att_id = data_c["id"]

    print(" [PASS] 5. Working Hours Calculated Precisely (8h, 8h 30m, 4h)")

    # -------------------------------------------------------------
    # 6. Overnight Shift Calculation Test (e.g. 21:00 to 05:00 = 8h)
    # -------------------------------------------------------------
    overnight_res = client.post(
        "/api/attendance",
        json={
            "labour_id": bob_worker_id,
            "attendance_date": test_date,
            "status": "present",
            "check_in": "21:00",
            "check_out": "05:00",
        },
        headers=bob_headers,
    )
    assert overnight_res.status_code == 201
    overnight_data = overnight_res.json()
    # (1440 - 21*60) + 5*60 = (1440 - 1260) + 300 = 180 + 300 = 480 mins (8h)
    assert overnight_data["working_minutes"] == 480
    assert overnight_data["working_hours_formatted"] == "8h"

    print(" [PASS] 6. Overnight Shift Handled Accurately (21:00 -> 05:00 = 8h)")

    # -------------------------------------------------------------
    # 7. Status Rules: Absent and Leave
    # -------------------------------------------------------------
    next_date = "2026-10-10"

    # Absent: working_minutes and overtime must be 0
    absent_res = client.post(
        "/api/attendance",
        json={
            "labour_id": w1_id,
            "attendance_date": next_date,
            "status": "absent",
            "check_in": "09:00",  # Even if accidental times are sent, absent enforces 0
            "check_out": "17:00",
            "overtime_minutes": 60,
        },
        headers=alice_headers,
    )
    assert absent_res.status_code == 201
    absent_data = absent_res.json()
    assert absent_data["status"] == "absent"
    assert absent_data["working_minutes"] == 0
    assert absent_data["overtime_minutes"] == 0
    assert absent_data["check_in"] is None
    assert absent_data["check_out"] is None

    # Leave: working_minutes and overtime must be 0
    leave_res = client.post(
        "/api/attendance",
        json={
            "labour_id": w2_id,
            "attendance_date": next_date,
            "status": "leave",
            "notes": "Medical leave approved",
        },
        headers=alice_headers,
    )
    assert leave_res.status_code == 201
    leave_data = leave_res.json()
    assert leave_data["status"] == "leave"
    assert leave_data["working_minutes"] == 0
    assert leave_data["overtime_minutes"] == 0

    print(" [PASS] 7. Absent & Leave Status Rules Strictly Enforced (Zero Hours)")

    # -------------------------------------------------------------
    # 8. Business Rule Validations
    # -------------------------------------------------------------
    third_date = "2026-10-11"

    # Negative overtime
    bad_ot = client.post(
        "/api/attendance",
        json={
            "labour_id": w1_id,
            "attendance_date": third_date,
            "status": "present",
            "overtime_minutes": -30,
        },
        headers=alice_headers,
    )
    assert bad_ot.status_code == 422

    # Overtime exceeding working minutes
    huge_ot = client.post(
        "/api/attendance",
        json={
            "labour_id": w1_id,
            "attendance_date": third_date,
            "status": "present",
            "check_in": "09:00",
            "check_out": "13:00",  # 240 mins
            "overtime_minutes": 300,  # 300 mins > 240 mins!
        },
        headers=alice_headers,
    )
    assert huge_ot.status_code == 422

    # Invalid status
    bad_status = client.post(
        "/api/attendance",
        json={
            "labour_id": w1_id,
            "attendance_date": third_date,
            "status": "vacation_party",
        },
        headers=alice_headers,
    )
    assert bad_status.status_code == 422

    print(" [PASS] 8. Input Validation & Overtime Bounds Strictly Enforced")

    # -------------------------------------------------------------
    # 9. Duplicate Attendance Prevention (409 Conflict)
    # -------------------------------------------------------------
    # w1 already has attendance on test_date (2026-10-09)
    duplicate_res = client.post(
        "/api/attendance",
        json={
            "labour_id": w1_id,
            "attendance_date": test_date,
            "status": "present",
            "check_in": "09:00",
            "check_out": "17:00",
        },
        headers=alice_headers,
    )
    assert duplicate_res.status_code == 409, f"Expected 409, got {duplicate_res.status_code}"

    print(" [PASS] 9. Duplicate Attendance Prevented with 409 Conflict")

    # -------------------------------------------------------------
    # 10. Bulk Attendance Submission (Upsert & Multiple Workers)
    # -------------------------------------------------------------
    bulk_date = "2026-10-12"
    bulk_res = client.post(
        "/api/attendance/bulk",
        json={
            "attendance_date": bulk_date,
            "farm_id": alice_farm_id,
            "records": [
                {
                    "labour_id": w1_id,
                    "status": "present",
                    "check_in": "08:30",
                    "check_out": "17:00",
                },
                {
                    "labour_id": w2_id,
                    "status": "absent",
                },
                {
                    "labour_id": w3_id,
                    "status": "half_day",
                    "check_in": "09:00",
                    "check_out": "13:00",
                },
            ],
        },
        headers=alice_headers,
    )
    assert bulk_res.status_code == 200, f"Bulk failed: {bulk_res.text}"
    bulk_data = bulk_res.json()
    assert bulk_data["total_submitted"] == 3
    assert bulk_data["created"] == 3
    assert bulk_data["failed"] == 0

    # Resubmitting with update modifies existing records without error
    bulk_update_res = client.post(
        "/api/attendance/bulk",
        json={
            "attendance_date": bulk_date,
            "farm_id": alice_farm_id,
            "records": [
                {
                    "labour_id": w2_id,  # Change Suresh from absent to present
                    "status": "present",
                    "check_in": "09:00",
                    "check_out": "17:00",
                },
            ],
        },
        headers=alice_headers,
    )
    assert bulk_update_res.status_code == 200
    bulk_update_data = bulk_update_res.json()
    assert bulk_update_data["updated"] == 1
    assert bulk_update_data["created"] == 0

    print(" [PASS] 10. Bulk Attendance Sheet & Safe Upsert Verified")

    # -------------------------------------------------------------
    # 11. Multi-Tenant Isolation
    # -------------------------------------------------------------
    # Bob attempts to view Alice's attendance record (w1_att_id)
    bob_view = client.get(f"/api/attendance/{w1_att_id}", headers=bob_headers)
    assert bob_view.status_code == 404

    # Bob attempts to update Alice's attendance record
    bob_put = client.put(
        f"/api/attendance/{w1_att_id}",
        json={"status": "absent"},
        headers=bob_headers,
    )
    assert bob_put.status_code == 404

    # Bob attempts to delete Alice's attendance record
    bob_del = client.delete(f"/api/attendance/{w1_att_id}", headers=bob_headers)
    assert bob_del.status_code == 404

    # Bob lists attendance - should NOT see Alice's records
    bob_list = client.get("/api/attendance", headers=bob_headers)
    assert bob_list.status_code == 200
    for rec in bob_list.json():
        assert rec["farm_id"] == bob_farm_id

    print(" [PASS] 11. Strict Multi-Tenant Data Isolation Verified (404 Across User B)")

    # -------------------------------------------------------------
    # 12. Attendance Record Updates & Corrections
    # -------------------------------------------------------------
    update_res = client.put(
        f"/api/attendance/{w1_att_id}",
        json={
            "check_out": "18:30",  # Changed from 17:00 to 18:30 (09:00 -> 18:30 = 9h 30m = 570 mins)
            "overtime_minutes": 60,
            "notes": "Completed extra plot tilling",
        },
        headers=alice_headers,
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["working_minutes"] == 570
    assert updated_data["working_hours_formatted"] == "9h 30m"
    assert updated_data["overtime_minutes"] == 60
    assert updated_data["notes"] == "Completed extra plot tilling"

    print(" [PASS] 12. Attendance Record Update & Recalculation Verified (PUT 200)")

    # -------------------------------------------------------------
    # 13. Daily Summary and Statistics
    # -------------------------------------------------------------
    summary_res = client.get(f"/api/attendance/summary?date={test_date}", headers=alice_headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_workers"] == 3
    assert summary["present"] == 2  # w1 and w2
    assert summary["half_day"] == 1  # w3
    assert summary["absent"] == 0
    assert summary["unmarked"] == 0
    assert summary["total_working_minutes"] == 570 + 510 + 240  # 1320 mins

    print(" [PASS] 13. Daily Summary Statistics & Working Hour Aggregates Verified")

    # -------------------------------------------------------------
    # 14. Nested Endpoints & Record Deletion
    # -------------------------------------------------------------
    # GET /api/labour/{labour_id}/attendance
    w1_history = client.get(f"/api/labour/{w1_id}/attendance", headers=alice_headers)
    assert w1_history.status_code == 200
    assert len(w1_history.json()) >= 2  # test_date, next_date, bulk_date

    # POST /api/labour/{labour_id}/attendance
    nested_create = client.post(
        f"/api/labour/{w1_id}/attendance",
        json={
            "attendance_date": "2026-10-15",
            "status": "present",
            "check_in": "09:00",
            "check_out": "17:00",
        },
        headers=alice_headers,
    )
    assert nested_create.status_code == 201
    created_id = nested_create.json()["id"]

    # DELETE /api/attendance/{id}
    del_res = client.delete(f"/api/attendance/{created_id}", headers=alice_headers)
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True

    # Verify 404 after deletion
    check_deleted = client.get(f"/api/attendance/{created_id}", headers=alice_headers)
    assert check_deleted.status_code == 404

    print(" [PASS] 14. Nested Worker Endpoints & Deletion Verified")

    print("=" * 70)
    print(" ALL 14/14 ATTENDANCE MANAGEMENT TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
