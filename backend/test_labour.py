"""Automated Test Suite for Phase 7: Labour Management.

Validates:
1. Multi-tenant user authentication (Alice and Bob).
2. Base estates creation for tenant isolation.
3. Unauthenticated operations blocked (401).
4. Cross-user farm labour creation blocked (404/unauthorized).
5. Valid worker creation verified on /api/labour (201).
6. Nested endpoint worker creation verified on /api/farms/{farm_id}/labour (201).
7. Input validation (blank name, negative wage, invalid status, missing farm_id).
8. Strict multi-tenant data isolation (User B cannot list, view, update, or deactivate User A's workers).
9. Search and filtering (by name, phone, work trade, status, and farm).
10. Worker profile updates (wage, phone, trade, notes).
11. Deactivation workflow (DELETE defaults to setting status=inactive, preserving record).
12. Permanent deletion workflow (DELETE with permanent=true).
13. Workforce statistics endpoint (/api/labour/stats).
14. Hierarchical cascade deletion (deleting farm deletes associated workers).
"""

import sys
import os
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.base import Base
from app.database.connection import get_db
import app.models  # Register all models: User, Farm, Field, Crop, Labour
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
    print("=" * 65)
    print(" Running Phase 7 Labour Management Automated Tests")
    print("=" * 65)

    # -------------------------------------------------------------
    # 1. Setup multi-tenant test accounts
    # -------------------------------------------------------------
    alice_reg = client.post(
        "/api/auth/register",
        json={
            "name": "Alice Workforce Lead",
            "email": "alice.labour@agricore.com",
            "password": "Password123!",
            "phone": "+91 9876543210",
        },
    )
    assert alice_reg.status_code == 201, f"Alice registration failed: {alice_reg.text}"
    alice_token = alice_reg.json()["data"]["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    bob_reg = client.post(
        "/api/auth/register",
        json={
            "name": "Bob Farm Manager",
            "email": "bob.labour@agricore.com",
            "password": "Password123!",
            "phone": "+91 9876543211",
        },
    )
    assert bob_reg.status_code == 201, f"Bob registration failed: {bob_reg.text}"
    bob_token = bob_reg.json()["data"]["access_token"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}
    client.cookies.clear()

    print(" [PASS] 1. User Accounts Registered & Tokens Issued")

    # -------------------------------------------------------------
    # 2. Setup Base Farms
    # -------------------------------------------------------------
    alice_farm_res = client.post(
        "/api/farms",
        json={
            "name": "Alice Heritage Ranch",
            "location": "Punjab, Sector 4",
            "total_area": 120.0,
            "area_unit": "acres",
        },
        headers=alice_headers,
    )
    assert alice_farm_res.status_code == 201
    alice_farm_id = alice_farm_res.json()["id"]

    bob_farm_res = client.post(
        "/api/farms",
        json={
            "name": "Bob Horizon Fields",
            "location": "Haryana, Plot 12",
            "total_area": 85.0,
            "area_unit": "acres",
        },
        headers=bob_headers,
    )
    assert bob_farm_res.status_code == 201
    bob_farm_id = bob_farm_res.json()["id"]

    print(" [PASS] 2. Base Estates Established for Tenants")

    # -------------------------------------------------------------
    # 3. Unauthenticated access blocked (401)
    # -------------------------------------------------------------
    unauth_list = client.get("/api/labour")
    assert unauth_list.status_code == 401, f"Expected 401, got {unauth_list.status_code}"

    unauth_create = client.post(
        "/api/labour",
        json={
            "farm_id": alice_farm_id,
            "name": "Ramesh Kumar",
            "daily_wage": 500.0,
            "joining_date": "2026-03-01",
        },
    )
    assert unauth_create.status_code == 401

    unauth_nested = client.get(f"/api/farms/{alice_farm_id}/labour")
    assert unauth_nested.status_code == 401

    print(" [PASS] 3. Unauthenticated Labour Operations Blocked (401)")

    # -------------------------------------------------------------
    # 4. Cross-user farm assignment blocked
    # -------------------------------------------------------------
    # Bob attempts to add labour to Alice's farm via /api/labour
    bob_spoof_labour = client.post(
        "/api/labour",
        json={
            "farm_id": alice_farm_id,
            "name": "Intruder Worker",
            "work_type": "Harvester",
            "daily_wage": 600.0,
            "joining_date": "2026-03-01",
        },
        headers=bob_headers,
    )
    assert bob_spoof_labour.status_code in (403, 404), (
        f"Expected 403/404 for cross-user assignment, got {bob_spoof_labour.status_code}"
    )

    # Bob attempts to add labour via nested endpoint /api/farms/{alice_farm_id}/labour
    bob_nested_spoof = client.post(
        f"/api/farms/{alice_farm_id}/labour",
        json={
            "name": "Intruder Worker 2",
            "daily_wage": 600.0,
            "joining_date": "2026-03-01",
        },
        headers=bob_headers,
    )
    assert bob_nested_spoof.status_code in (403, 404)

    print(" [PASS] 4. Cross-User Farm Worker Assignment Blocked (404)")

    # -------------------------------------------------------------
    # 5. Input validation tests
    # -------------------------------------------------------------
    # Blank name
    bad_name = client.post(
        "/api/labour",
        json={
            "farm_id": alice_farm_id,
            "name": "   ",
            "daily_wage": 500.0,
            "joining_date": "2026-03-01",
        },
        headers=alice_headers,
    )
    assert bad_name.status_code == 422

    # Negative wage
    bad_wage = client.post(
        "/api/labour",
        json={
            "farm_id": alice_farm_id,
            "name": "Ramesh Kumar",
            "daily_wage": -150.0,
            "joining_date": "2026-03-01",
        },
        headers=alice_headers,
    )
    assert bad_wage.status_code == 422

    # Invalid status
    bad_status = client.post(
        "/api/labour",
        json={
            "farm_id": alice_farm_id,
            "name": "Ramesh Kumar",
            "daily_wage": 500.0,
            "joining_date": "2026-03-01",
            "status": "terminated_unknown",
        },
        headers=alice_headers,
    )
    assert bad_status.status_code == 422

    # Missing farm_id on /api/labour
    missing_farm = client.post(
        "/api/labour",
        json={
            "name": "Ramesh Kumar",
            "daily_wage": 500.0,
            "joining_date": "2026-03-01",
        },
        headers=alice_headers,
    )
    assert missing_farm.status_code == 400

    print(" [PASS] 5. Input Validations Strictly Enforced (Blank Name, Negative Wage, Invalid Status)")

    # -------------------------------------------------------------
    # 6. Valid Worker Creation via /api/labour
    # -------------------------------------------------------------
    alice_worker_res = client.post(
        "/api/labour",
        json={
            "farm_id": alice_farm_id,
            "name": "Ramesh Patel",
            "phone": "+91 9876543220",
            "address": "Village Kotla, Sector 3",
            "work_type": "Tractor Operator",
            "daily_wage": 750.0,
            "joining_date": "2026-02-15",
            "status": "active",
            "notes": "Experienced heavy tractor and combine harvester driver",
        },
        headers=alice_headers,
    )
    assert alice_worker_res.status_code == 201, f"Failed: {alice_worker_res.text}"
    alice_worker = alice_worker_res.json()
    alice_worker_id = alice_worker["id"]
    assert alice_worker["name"] == "Ramesh Patel"
    assert alice_worker["work_type"] == "Tractor Operator"
    assert float(alice_worker["daily_wage"]) == 750.0
    assert alice_worker["farm_name"] == "Alice Heritage Ranch"

    print(" [PASS] 6. Worker Creation Verified via /api/labour (201)")

    # -------------------------------------------------------------
    # 7. Worker Creation via Nested Endpoint /api/farms/{id}/labour
    # -------------------------------------------------------------
    alice_worker_2_res = client.post(
        f"/api/farms/{alice_farm_id}/labour",
        json={
            "name": "Suresh Singh",
            "phone": "+91 9876543221",
            "work_type": "Irrigation Worker",
            "daily_wage": 550.0,
            "joining_date": "2026-03-01",
            "status": "active",
            "notes": "Handles drip irrigation valves and motor maintenance",
        },
        headers=alice_headers,
    )
    assert alice_worker_2_res.status_code == 201
    alice_worker_2_id = alice_worker_2_res.json()["id"]

    # Bob creates a worker on Bob's farm
    bob_worker_res = client.post(
        f"/api/farms/{bob_farm_id}/labour",
        json={
            "name": "Dinesh Sharma",
            "work_type": "General Labour",
            "daily_wage": 450.0,
            "joining_date": "2026-01-10",
            "status": "active",
        },
        headers=bob_headers,
    )
    assert bob_worker_res.status_code == 201
    bob_worker_id = bob_worker_res.json()["id"]

    print(" [PASS] 7. Nested Farm Labour Creation Verified (201)")

    # -------------------------------------------------------------
    # 8. Multi-Tenant Isolation
    # -------------------------------------------------------------
    # Bob lists labour - should ONLY see Dinesh, NOT Ramesh or Suresh
    bob_list = client.get("/api/labour", headers=bob_headers)
    assert bob_list.status_code == 200
    bob_workers = bob_list.json()
    assert len(bob_workers) == 1
    assert bob_workers[0]["id"] == bob_worker_id
    assert bob_workers[0]["name"] == "Dinesh Sharma"

    # Bob tries to read Alice's worker
    bob_read = client.get(f"/api/labour/{alice_worker_id}", headers=bob_headers)
    assert bob_read.status_code == 404

    # Bob tries to update Alice's worker
    bob_update = client.put(
        f"/api/labour/{alice_worker_id}",
        json={"name": "Hacked Name"},
        headers=bob_headers,
    )
    assert bob_update.status_code == 404

    # Bob tries to deactivate Alice's worker
    bob_delete = client.delete(f"/api/labour/{alice_worker_id}", headers=bob_headers)
    assert bob_delete.status_code == 404

    # Bob tries to list Alice's farm labour
    bob_farm_labour = client.get(f"/api/farms/{alice_farm_id}/labour", headers=bob_headers)
    assert bob_farm_labour.status_code == 404

    print(" [PASS] 8. Strict User Isolation Verified (User B receives 404 across all User A endpoints)")

    # -------------------------------------------------------------
    # 9. Search and Filter
    # -------------------------------------------------------------
    # Alice searches for "Ramesh"
    search_ramesh = client.get("/api/labour?search=ramesh", headers=alice_headers)
    assert search_ramesh.status_code == 200
    assert len(search_ramesh.json()) == 1
    assert search_ramesh.json()[0]["name"] == "Ramesh Patel"

    # Alice searches for phone digit
    search_phone = client.get("/api/labour?search=9876543220", headers=alice_headers)
    assert search_phone.status_code == 200
    assert len(search_phone.json()) == 1

    # Alice searches by work type
    search_trade = client.get("/api/labour?work_type=Tractor Operator", headers=alice_headers)
    assert search_trade.status_code == 200
    assert len(search_trade.json()) == 1

    # Filter by farm_id
    farm_filter = client.get(f"/api/labour?farm_id={alice_farm_id}", headers=alice_headers)
    assert farm_filter.status_code == 200
    assert len(farm_filter.json()) == 2

    print(" [PASS] 9. Search and Multi-Criteria Filtering Verified")

    # -------------------------------------------------------------
    # 10. Worker Profile Update
    # -------------------------------------------------------------
    update_res = client.put(
        f"/api/labour/{alice_worker_id}",
        json={
            "daily_wage": 800.0,
            "phone": "+91 9999988888",
            "notes": "Promoted to Senior Equipment Specialist",
        },
        headers=alice_headers,
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert float(updated_data["daily_wage"]) == 800.0
    assert updated_data["phone"] == "+91 9999988888"
    assert updated_data["notes"] == "Promoted to Senior Equipment Specialist"
    # Unchanged fields remain preserved
    assert updated_data["name"] == "Ramesh Patel"
    assert updated_data["work_type"] == "Tractor Operator"

    print(" [PASS] 10. Worker Profile Updating Verified (200)")

    # -------------------------------------------------------------
    # 11. Deactivation Workflow
    # -------------------------------------------------------------
    # Default DELETE should perform non-destructive deactivation (status=inactive)
    deact_res = client.delete(f"/api/labour/{alice_worker_2_id}", headers=alice_headers)
    assert deact_res.status_code == 200
    deact_data = deact_res.json()
    assert deact_data["deactivated"] is True
    assert deact_data["status"] == "inactive"

    # Worker still exists in database and can be retrieved
    check_worker_2 = client.get(f"/api/labour/{alice_worker_2_id}", headers=alice_headers)
    assert check_worker_2.status_code == 200
    assert check_worker_2.json()["status"] == "inactive"

    # Filtering by active returns only Ramesh
    active_list = client.get("/api/labour?status=active", headers=alice_headers)
    assert len(active_list.json()) == 1
    assert active_list.json()[0]["id"] == alice_worker_id

    # Filtering by inactive returns Suresh
    inactive_list = client.get("/api/labour?status=inactive", headers=alice_headers)
    assert len(inactive_list.json()) == 1
    assert inactive_list.json()[0]["id"] == alice_worker_2_id

    print(" [PASS] 11. Non-destructive Worker Deactivation Verified (Active -> Inactive)")

    # -------------------------------------------------------------
    # 12. Permanent Deletion Workflow
    # -------------------------------------------------------------
    perm_del_res = client.delete(
        f"/api/labour/{alice_worker_2_id}?permanent=true",
        headers=alice_headers,
    )
    assert perm_del_res.status_code == 200
    assert perm_del_res.json()["status"] == "deleted"

    # Worker now 404s
    verify_purged = client.get(f"/api/labour/{alice_worker_2_id}", headers=alice_headers)
    assert verify_purged.status_code == 404

    print(" [PASS] 12. Permanent Worker Deletion Verified (permanent=true)")

    # -------------------------------------------------------------
    # 13. Workforce Statistics Endpoint
    # -------------------------------------------------------------
    # Create another inactive worker for Alice
    client.post(
        f"/api/farms/{alice_farm_id}/labour",
        json={
            "name": "Manish Verma",
            "daily_wage": 400.0,
            "joining_date": "2026-01-01",
            "status": "inactive",
        },
        headers=alice_headers,
    )

    stats_res = client.get("/api/labour/stats", headers=alice_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_workers"] == 2
    assert stats["active_workers"] == 1
    assert stats["inactive_workers"] == 1

    print(" [PASS] 13. Workforce Summary Statistics Verified (/api/labour/stats)")

    # -------------------------------------------------------------
    # 14. Cascade Deletion (Deleting Farm cascades to Workers)
    # -------------------------------------------------------------
    del_farm_res = client.delete(f"/api/farms/{alice_farm_id}", headers=alice_headers)
    assert del_farm_res.status_code == 200

    # Alice's remaining workers are deleted with the farm
    alice_after_cascade = client.get("/api/labour", headers=alice_headers)
    assert alice_after_cascade.status_code == 200
    assert len(alice_after_cascade.json()) == 0

    print(" [PASS] 14. Hierarchical Cascade Deletion Verified (Farm -> Labour)")

    print("=" * 65)
    print(" ALL 14/14 LABOUR MANAGEMENT TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    run_tests()
