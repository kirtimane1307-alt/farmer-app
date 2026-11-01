"""Automated Test Suite for Phase 5: Farm and Field Management.

Validates:
1. Authenticated farm creation and field counting.
2. Case-insensitive duplicate farm name rejection.
3. Strict user ownership isolation (User B cannot see or manipulate User A's farm).
4. Unauthenticated request rejection (401).
5. Field creation on owned farm.
6. Case-insensitive duplicate field name on same farm rejection.
7. User isolation on fields (User B cannot view or add fields on User A's farm).
8. Direct field retrieval, update, and deletion with ownership verification.
9. Farm deletion cascade verification (deleting farm deletes child fields).
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
import app.models  # Register all models (User, Farm, Field)
from app.main import app

# In-memory SQLite database isolated for testing
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
    print(" Running Phase 5 Farm & Field Management Automated Tests")
    print("=" * 65)

    # 1. Register User A and User B
    resp_a = client.post(
        "/api/auth/register",
        json={
            "name": "Farmer Alice",
            "email": "alice.farmer@agricore.com",
            "password": "SecurePassword123",
            "phone": "+1-555-1111",
        },
    )
    assert resp_a.status_code == 201, f"User A registration failed: {resp_a.text}"
    token_a = resp_a.json()["data"]["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    resp_b = client.post(
        "/api/auth/register",
        json={
            "name": "Farmer Bob",
            "email": "bob.farmer@agricore.com",
            "password": "SecurePassword123",
            "phone": "+1-555-2222",
        },
    )
    assert resp_b.status_code == 201, f"User B registration failed: {resp_b.text}"
    token_b = resp_b.json()["data"]["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    client.cookies.clear()

    print(" [PASS] 1. Multiple User Authentication Verified")

    # 2. Unauthenticated farm creation rejected
    unauth_client = TestClient(app)
    resp_unauth = unauth_client.post(
        "/api/farms",
        json={
            "name": "Secret Farm",
            "location": "Nowhere",
            "total_area": 10.0,
            "area_unit": "acres",
        },
    )
    assert resp_unauth.status_code == 401, f"Unauthenticated farm creation was not rejected: {resp_unauth.status_code}"
    print(" [PASS] 2. Unauthenticated Farm Operations Blocked (401)")

    # 3. User A creates Farm 1 ("Green Valley")
    resp_f1 = client.post(
        "/api/farms",
        headers=headers_a,
        json={
            "name": "Green Valley Farm",
            "location": "Nashik, Maharashtra",
            "total_area": 50.5,
            "area_unit": "acres",
        },
    )
    assert resp_f1.status_code == 201, f"Farm creation failed: {resp_f1.text}"
    farm_1 = resp_f1.json()
    farm_1_id = farm_1["id"]
    assert farm_1["name"] == "Green Valley Farm"
    assert farm_1["location"] == "Nashik, Maharashtra"
    assert float(farm_1["total_area"]) == 50.5
    print(" [PASS] 3. User A Farm Creation Verified (201)")

    # 4. Duplicate farm name rejection for User A
    resp_dup = client.post(
        "/api/farms",
        headers=headers_a,
        json={
            "name": "green valley farm",  # Case difference
            "location": "Somewhere else",
            "total_area": 20.0,
            "area_unit": "acres",
        },
    )
    assert resp_dup.status_code == 400, "Duplicate farm name was not rejected"
    print(" [PASS] 4. Duplicate Farm Name Rejection Verified (400)")

    # 5. User B lists farms -> Should be empty
    resp_b_farms = client.get("/api/farms", headers=headers_b)
    assert resp_b_farms.status_code == 200
    assert len(resp_b_farms.json()) == 0, "User B saw User A's farm!"
    print(" [PASS] 5. Farm Isolation on Listing Verified (User B sees 0 farms)")

    # 6. User B attempts unauthorized access on User A's farm -> 404
    resp_b_get = client.get(f"/api/farms/{farm_1_id}", headers=headers_b)
    assert resp_b_get.status_code == 404, "User B was able to view User A's farm!"

    resp_b_put = client.put(
        f"/api/farms/{farm_1_id}",
        headers=headers_b,
        json={"name": "Hacked Farm"},
    )
    assert resp_b_put.status_code == 404, "User B was able to update User A's farm!"

    resp_b_del = client.delete(f"/api/farms/{farm_1_id}", headers=headers_b)
    assert resp_b_del.status_code == 404, "User B was able to delete User A's farm!"
    print(" [PASS] 6. Cross-User Farm Access Blocked (GET/PUT/DELETE return 404)")

    # 7. User A creates Field 1 and Field 2 on Farm 1
    resp_field_1 = client.post(
        f"/api/farms/{farm_1_id}/fields",
        headers=headers_a,
        json={
            "name": "North Plot",
            "area": 20.0,
            "area_unit": "acres",
            "soil_type": "Black Loam",
            "irrigation_type": "Drip Irrigation",
            "description": "Premium organic cotton zone",
        },
    )
    assert resp_field_1.status_code == 201, f"Field 1 creation failed: {resp_field_1.text}"
    field_1 = resp_field_1.json()
    field_1_id = field_1["id"]
    assert field_1["name"] == "North Plot"
    assert field_1["soil_type"] == "Black Loam"

    resp_field_2 = client.post(
        f"/api/farms/{farm_1_id}/fields",
        headers=headers_a,
        json={
            "name": "South Plot",
            "area": 15.5,
            "area_unit": "acres",
            "soil_type": "Red Clay",
            "irrigation_type": "Sprinkler",
        },
    )
    assert resp_field_2.status_code == 201
    field_2_id = resp_field_2.json()["id"]
    print(" [PASS] 7. Field Creation on Owned Farm Verified (201)")

    # 8. Duplicate field name on same farm rejection
    resp_field_dup = client.post(
        f"/api/farms/{farm_1_id}/fields",
        headers=headers_a,
        json={
            "name": "north plot",
            "area": 5.0,
            "area_unit": "acres",
        },
    )
    assert resp_field_dup.status_code == 400, "Duplicate field name was not rejected"
    print(" [PASS] 8. Duplicate Field Name on Same Farm Rejected (400)")

    # 9. Cross-user field operations blocked (User B cannot list or add fields on User A's farm)
    resp_b_f_list = client.get(f"/api/farms/{farm_1_id}/fields", headers=headers_b)
    assert resp_b_f_list.status_code == 404, "User B was able to view fields on User A's farm"

    resp_b_f_add = client.post(
        f"/api/farms/{farm_1_id}/fields",
        headers=headers_b,
        json={"name": "Intruder Plot", "area": 5.0},
    )
    assert resp_b_f_add.status_code == 404, "User B was able to add field to User A's farm"

    resp_b_f_get = client.get(f"/api/fields/{field_1_id}", headers=headers_b)
    assert resp_b_f_get.status_code == 404, "User B was able to access field directly"
    print(" [PASS] 9. Cross-User Field Access Blocked (404)")

    # 10. User A lists fields and checks dynamic field_count on farm
    resp_a_f_list = client.get(f"/api/farms/{farm_1_id}/fields", headers=headers_a)
    assert resp_a_f_list.status_code == 200
    fields_list = resp_a_f_list.json()
    assert len(fields_list) == 2

    resp_a_farms = client.get("/api/farms", headers=headers_a)
    assert resp_a_farms.status_code == 200
    farms_list = resp_a_farms.json()
    assert farms_list[0]["field_count"] == 2
    print(" [PASS] 10. Field Listing and Farm Field Count Verified (count=2)")

    # 11. User A updates field
    resp_f1_up = client.put(
        f"/api/fields/{field_1_id}",
        headers=headers_a,
        json={"name": "North Agro Plot", "area": 22.0},
    )
    assert resp_f1_up.status_code == 200
    assert resp_f1_up.json()["name"] == "North Agro Plot"
    assert float(resp_f1_up.json()["area"]) == 22.0
    print(" [PASS] 11. Field Property Update Verified (200)")

    # 12. User A deletes Field 2 directly
    resp_del_f2 = client.delete(f"/api/fields/{field_2_id}", headers=headers_a)
    assert resp_del_f2.status_code == 200
    assert resp_del_f2.json()["deleted"] is True

    resp_a_f_list2 = client.get(f"/api/farms/{farm_1_id}/fields", headers=headers_a)
    assert len(resp_a_f_list2.json()) == 1
    print(" [PASS] 12. Individual Field Deletion Verified (200)")

    # 13. Cascade deletion: Deleting Farm 1 removes child fields
    resp_del_farm = client.delete(f"/api/farms/{farm_1_id}", headers=headers_a)
    assert resp_del_farm.status_code == 200
    del_data = resp_del_farm.json()
    assert del_data["deleted"] is True
    assert del_data["fields_removed"] == 1

    # Verify field is deleted from DB
    resp_orphan_field = client.get(f"/api/fields/{field_1_id}", headers=headers_a)
    assert resp_orphan_field.status_code == 404
    print(" [PASS] 13. Cascade Farm Deletion Verified (Farm & Fields Removed)")

    print("=" * 65)
    print(" ALL 13/13 FARM & FIELD MANAGEMENT TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    run_tests()
