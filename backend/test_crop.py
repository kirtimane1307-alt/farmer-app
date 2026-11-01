"""Automated Test Suite for Phase 6: Crop Management.

Validates:
1. Multi-tenant user authentication.
2. Cross-user field assignment protection (User B cannot add crop to User A's field).
3. Crop cycle creation with agronomic parameters (variety, season, dates, area, seeds).
4. Duplicate crop cycle prevention on the same field & date.
5. Strict user data isolation (User B cannot list, view, update, or delete User A's crops).
6. Multi-criteria filtering (status, search keywords, field ID).
7. Field-specific nested crop endpoints (/api/fields/{id}/crops).
8. Crop lifecycle state transitions and metadata updates.
9. Individual crop deletion.
10. Hierarchical cascade deletion (deleting farm cascades to field and child crops).
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
import app.models  # Register all models: User, Farm, Field, Crop
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
    print(" Running Phase 6 Crop Management Automated Tests")
    print("=" * 65)

    # 1. Register User A and User B
    resp_a = client.post(
        "/api/auth/register",
        json={
            "name": "Farmer Alice",
            "email": "alice.crop@agricore.com",
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
            "email": "bob.crop@agricore.com",
            "password": "SecurePassword123",
            "phone": "+1-555-2222",
        },
    )
    assert resp_b.status_code == 201, f"User B registration failed: {resp_b.text}"
    token_b = resp_b.json()["data"]["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    client.cookies.clear()

    print(" [PASS] 1. User Accounts Registered & Tokens Issued")

    # 2. Setup Farms & Fields for both users
    # User A creates Farm & Field
    resp_farm_a = client.post(
        "/api/farms",
        headers=headers_a,
        json={"name": "Alice Valley Farm", "location": "Nashik", "total_area": 50.0, "area_unit": "acres"},
    )
    assert resp_farm_a.status_code == 201
    farm_a_id = resp_farm_a.json()["id"]

    resp_field_a = client.post(
        f"/api/farms/{farm_a_id}/fields",
        headers=headers_a,
        json={"name": "Plot Alpha", "area": 20.0, "soil_type": "Black Loam", "irrigation_type": "Drip"},
    )
    assert resp_field_a.status_code == 201
    field_a_id = resp_field_a.json()["id"]

    # User B creates Farm & Field
    resp_farm_b = client.post(
        "/api/farms",
        headers=headers_b,
        json={"name": "Bob Greenfields", "location": "Pune", "total_area": 30.0, "area_unit": "acres"},
    )
    assert resp_farm_b.status_code == 201
    farm_b_id = resp_farm_b.json()["id"]

    resp_field_b = client.post(
        f"/api/farms/{farm_b_id}/fields",
        headers=headers_b,
        json={"name": "Plot Beta", "area": 15.0, "soil_type": "Red Clay", "irrigation_type": "Sprinkler"},
    )
    assert resp_field_b.status_code == 201
    field_b_id = resp_field_b.json()["id"]

    print(" [PASS] 2. Base Estates and Subdivided Plots Established")

    # 3. Unauthenticated crop creation blocked
    unauth_client = TestClient(app)
    resp_unauth = unauth_client.post(
        "/api/crops",
        json={
            "field_id": field_a_id,
            "name": "Wheat",
            "variety": "HD-2967",
            "sowing_date": "2026-11-01",
        },
    )
    assert resp_unauth.status_code == 401
    print(" [PASS] 3. Unauthenticated Crop Operations Blocked (401)")

    # 4. Cross-user field assignment blocked (User B cannot add crop to User A's field)
    resp_cross_add = client.post(
        "/api/crops",
        headers=headers_b,
        json={
            "field_id": field_a_id,
            "name": "Intruder Crop",
            "variety": "Fake Variety",
            "sowing_date": "2026-11-01",
        },
    )
    assert resp_cross_add.status_code == 404, "User B was able to attach crop to User A's plot!"

    resp_nested_cross = client.post(
        f"/api/fields/{field_a_id}/crops",
        headers=headers_b,
        json={
            "name": "Intruder Crop 2",
            "variety": "Fake Variety 2",
            "sowing_date": "2026-11-01",
        },
    )
    assert resp_nested_cross.status_code == 404
    print(" [PASS] 4. Cross-User Plot Assignment Blocked (404)")

    # 5. User A creates Crop 1: Wheat (variety HD-2967, season Rabi)
    resp_crop_1 = client.post(
        "/api/crops",
        headers=headers_a,
        json={
            "field_id": field_a_id,
            "name": "Wheat",
            "variety": "HD-2967",
            "season": "Rabi",
            "sowing_date": "2026-11-01",
            "expected_harvest_date": "2027-03-25",
            "status": "planned",
            "planted_area": 15.0,
            "planted_area_unit": "acres",
            "seed_quantity": 150.0,
            "seed_unit": "kg",
            "notes": "Certified seed with fungicide coating",
        },
    )
    assert resp_crop_1.status_code == 201, f"Crop creation failed: {resp_crop_1.text}"
    crop_1 = resp_crop_1.json()
    crop_1_id = crop_1["id"]
    assert crop_1["name"] == "Wheat"
    assert crop_1["variety"] == "HD-2967"
    assert crop_1["field_name"] == "Plot Alpha"
    assert crop_1["farm_name"] == "Alice Valley Farm"
    assert crop_1["status"] == "planned"
    print(" [PASS] 5. Valid Crop Cycle Creation Verified (201)")

    # 6. Duplicate crop cycle on same plot & date rejected
    resp_crop_dup = client.post(
        "/api/crops",
        headers=headers_a,
        json={
            "field_id": field_a_id,
            "name": "wheat",  # case-insensitive
            "variety": "hd-2967",
            "sowing_date": "2026-11-01",
        },
    )
    assert resp_crop_dup.status_code == 400
    print(" [PASS] 6. Duplicate Crop Sowing on Same Plot Rejected (400)")

    # 7. User A creates Crop 2: Mustard via nested field endpoint
    resp_crop_2 = client.post(
        f"/api/fields/{field_a_id}/crops",
        headers=headers_a,
        json={
            "name": "Mustard",
            "variety": "Pusa Bold",
            "season": "Rabi",
            "sowing_date": "2026-11-05",
            "expected_harvest_date": "2027-02-20",
            "status": "growing",
            "planted_area": 5.0,
            "seed_quantity": 25.0,
            "seed_unit": "kg",
        },
    )
    assert resp_crop_2.status_code == 201
    crop_2_id = resp_crop_2.json()["id"]
    print(" [PASS] 7. Nested Field Endpoint Crop Creation Verified (201)")

    # 8. User B lists crops -> Should return empty list
    resp_b_crops = client.get("/api/crops", headers=headers_b)
    assert resp_b_crops.status_code == 200
    assert len(resp_b_crops.json()) == 0, "User B saw User A's crops!"

    # User B attempts to access, update, or delete User A's crop -> 404
    resp_b_get = client.get(f"/api/crops/{crop_1_id}", headers=headers_b)
    assert resp_b_get.status_code == 404

    resp_b_put = client.put(f"/api/crops/{crop_1_id}", headers=headers_b, json={"status": "failed"})
    assert resp_b_put.status_code == 404

    resp_b_del = client.delete(f"/api/crops/{crop_1_id}", headers=headers_b)
    assert resp_b_del.status_code == 404
    print(" [PASS] 8. User Crop Isolation Verified (GET/PUT/DELETE return 404 for User B)")

    # 9. Multi-criteria filtering by status, search, and field
    # Status filter: growing
    resp_filter_status = client.get("/api/crops?status=growing", headers=headers_a)
    assert resp_filter_status.status_code == 200
    assert len(resp_filter_status.json()) == 1
    assert resp_filter_status.json()[0]["name"] == "Mustard"

    # Search filter: "wheat"
    resp_filter_search = client.get("/api/crops?search=wheat", headers=headers_a)
    assert resp_filter_search.status_code == 200
    assert len(resp_filter_search.json()) == 1
    assert resp_filter_search.json()[0]["name"] == "Wheat"

    # Field-specific listing
    resp_field_crops = client.get(f"/api/fields/{field_a_id}/crops", headers=headers_a)
    assert resp_field_crops.status_code == 200
    assert len(resp_field_crops.json()) == 2
    print(" [PASS] 9. Multi-Criteria Filtering & Field-Specific Querying Verified")

    # 10. Update crop status and lifecycle
    resp_crop_update = client.put(
        f"/api/crops/{crop_1_id}",
        headers=headers_a,
        json={
            "status": "growing",
            "notes": "Excellent germination, first irrigation completed",
        },
    )
    assert resp_crop_update.status_code == 200
    assert resp_crop_update.json()["status"] == "growing"
    assert "germination" in resp_crop_update.json()["notes"]
    print(" [PASS] 10. Crop Lifecycle & Property Updates Verified (200)")

    # 11. Individual crop deletion
    resp_del_c2 = client.delete(f"/api/crops/{crop_2_id}", headers=headers_a)
    assert resp_del_c2.status_code == 200
    assert resp_del_c2.json()["deleted"] is True

    resp_a_remaining = client.get("/api/crops", headers=headers_a)
    assert len(resp_a_remaining.json()) == 1
    print(" [PASS] 11. Individual Crop Deletion Verified (200)")

    # 12. Hierarchical cascade deletion: Deleting Farm A removes Field A and Crop 1
    resp_del_farm = client.delete(f"/api/farms/{farm_a_id}", headers=headers_a)
    assert resp_del_farm.status_code == 200

    resp_orphan_crop = client.get(f"/api/crops/{crop_1_id}", headers=headers_a)
    assert resp_orphan_crop.status_code == 404
    print(" [PASS] 12. Hierarchical Cascade Deletion Verified (Farm -> Field -> Crop)")

    print("=" * 65)
    print(" ALL 12/12 CROP MANAGEMENT TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    run_tests()
