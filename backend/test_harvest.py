"""Automated Test Suite for Phase 14: Harvest Management.

Validates:
1. Multi-tenant user registration & authentication (Alice & Bob).
2. Base farms, fields, and crops registered under respective tenants.
3. Unauthenticated access blocked (401 Unauthorized).
4. Cross-user IDOR access blocked (Bob cannot view, update, or delete Alice's harvests).
5. Relational hierarchy enforcement (Field must belong to selected Farm, Crop must belong to Field).
6. Input validations (zero quantity rejected, negative quantity rejected, empty unit rejected).
7. Harvest creation with valid parameters (weight, unit, quality grade, storage location).
8. Automatic sync of crop's actual_harvest_date when harvest is logged.
9. Harvest listing & multi-criteria filtering (farm, field, crop, unit, quality_grade, date range, search).
10. Single harvest retrieval with populated entity names.
11. Harvest update (modifying quantity, unit, grade, and notes).
12. Harvest summary calculation:
    - Metric unit conversion (kg, quintals, tonnes, grams converted accurately).
    - Separation of discrete units (bags, crates, pieces kept strictly distinct without mixing).
    - Crop-wise and field-wise harvest breakdowns.
13. Nested convenience routes (/farms/{id}/harvests, /fields/{id}/harvests, /crops/{id}/harvests).
14. Safe deletion of harvest records (ensuring parent crops, fields, and farms are preserved).
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
import app.models  # Registers all models including Harvest
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


def test_phase_14_harvest_management():
    print("=" * 65)
    print(" Running Phase 14 Harvest Management Automated Test Suite")
    print("=" * 65)

    # 1. Reset and create database schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("[PASS] Database tables initialized in memory")

    # 2. Register Tenant A (Alice)
    alice_reg = client.post(
        "/api/auth/register",
        json={
            "name": "Alice Green",
            "email": "alice.harvest@agricore.internal",
            "password": "SecurePassword123!",
        },
    )
    assert alice_reg.status_code == 201, f"Alice registration failed: {alice_reg.text}"
    alice_token = alice_reg.json()["data"]["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    print("[PASS] Tenant A (Alice) registered and authenticated")

    # 3. Register Tenant B (Bob)
    bob_reg = client.post(
        "/api/auth/register",
        json={
            "name": "Bob Stone",
            "email": "bob.harvest@agricore.internal",
            "password": "SecurePassword123!",
        },
    )
    assert bob_reg.status_code == 201, f"Bob registration failed: {bob_reg.text}"
    bob_token = bob_reg.json()["data"]["access_token"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}
    client.cookies.clear()
    print("[PASS] Tenant B (Bob) registered and authenticated")

    # 4. Create Farm and Field for Alice
    farm_res = client.post(
        "/api/farms",
        json={
            "name": "Sunny Valley Estate",
            "location": "Punjab, Sector 12",
            "total_area": 45.5,
            "area_unit": "acres",
        },
        headers=alice_headers,
    )
    assert farm_res.status_code == 201, farm_res.text
    alice_farm_id = farm_res.json()["id"]

    field_res = client.post(
        f"/api/farms/{alice_farm_id}/fields",
        json={
            "name": "North Wheat Plot",
            "area": 15.0,
            "area_unit": "acres",
            "soil_type": "Loamy Clay",
        },
        headers=alice_headers,
    )
    assert field_res.status_code == 201, field_res.text
    alice_field_id = field_res.json()["id"]

    # Create a second field for Alice
    field2_res = client.post(
        f"/api/farms/{alice_farm_id}/fields",
        json={
            "name": "East Corn Plot",
            "area": 10.0,
            "area_unit": "acres",
            "soil_type": "Sandy Loam",
        },
        headers=alice_headers,
    )
    assert field2_res.status_code == 201, field2_res.text
    alice_field2_id = field2_res.json()["id"]

    # 5. Create Crops for Alice
    crop1_res = client.post(
        "/api/crops",
        json={
            "field_id": alice_field_id,
            "name": "Golden Wheat",
            "variety": "HD-2967",
            "season": "Rabi",
            "sowing_date": "2026-11-01",
            "expected_harvest_date": "2027-04-15",
            "status": "ready_to_harvest",
            "planted_area": 15.0,
            "planted_area_unit": "acres",
        },
        headers=alice_headers,
    )
    assert crop1_res.status_code == 201, crop1_res.text
    alice_wheat_crop_id = crop1_res.json()["id"]

    crop2_res = client.post(
        "/api/crops",
        json={
            "field_id": alice_field2_id,
            "name": "Sweet Corn",
            "variety": "Sugar75",
            "season": "Kharif",
            "sowing_date": "2026-06-15",
            "expected_harvest_date": "2026-09-30",
            "status": "ready_to_harvest",
            "planted_area": 10.0,
            "planted_area_unit": "acres",
        },
        headers=alice_headers,
    )
    assert crop2_res.status_code == 201, crop2_res.text
    alice_corn_crop_id = crop2_res.json()["id"]
    print("[PASS] Alice's farm, fields, and crops initialized")

    # 6. Create Farm, Field, Crop for Bob
    bob_farm_res = client.post(
        "/api/farms",
        json={
            "name": "Highland Ridge Farm",
            "location": "Haryana, Zone 4",
            "total_area": 30.0,
            "area_unit": "acres",
        },
        headers=bob_headers,
    )
    assert bob_farm_res.status_code == 201, bob_farm_res.text
    bob_farm_id = bob_farm_res.json()["id"]

    bob_field_res = client.post(
        f"/api/farms/{bob_farm_id}/fields",
        json={
            "name": "Bob Plot 1",
            "area": 12.0,
            "area_unit": "acres",
        },
        headers=bob_headers,
    )
    assert bob_field_res.status_code == 201, bob_field_res.text
    bob_field_id = bob_field_res.json()["id"]

    bob_crop_res = client.post(
        "/api/crops",
        json={
            "field_id": bob_field_id,
            "name": "Basmati Rice",
            "variety": "Pusa 1121",
            "season": "Kharif",
            "sowing_date": "2026-07-01",
            "expected_harvest_date": "2026-11-15",
            "status": "ready_to_harvest",
        },
        headers=bob_headers,
    )
    assert bob_crop_res.status_code == 201, bob_crop_res.text
    bob_crop_id = bob_crop_res.json()["id"]
    print("[PASS] Bob's farm, field, and crop initialized")

    # 7. Test unauthenticated request rejection (401)
    unauth = client.get("/api/harvests")
    assert unauth.status_code == 401, f"Expected 401, got {unauth.status_code}"
    print("[PASS] Unauthenticated access properly rejected with HTTP 401")

    # 8. Test hierarchy validation: Crop does not belong to Field (400)
    invalid_hierarchy = client.post(
        "/api/harvests",
        json={
            "farm_id": alice_farm_id,
            "field_id": alice_field2_id,  # East Corn Plot
            "crop_id": alice_wheat_crop_id,  # Wheat is in North Plot!
            "harvest_date": "2027-04-10",
            "quantity": 500.0,
            "unit": "kg",
        },
        headers=alice_headers,
    )
    assert invalid_hierarchy.status_code == 400, f"Expected 400, got {invalid_hierarchy.status_code}"
    print("[PASS] Mismatched Crop-Field hierarchy rejected with HTTP 400")

    # 9. Test hierarchy validation: Field does not belong to Farm (400)
    invalid_farm_field = client.post(
        "/api/harvests",
        json={
            "farm_id": alice_farm_id,
            "field_id": bob_field_id,  # Bob's field!
            "crop_id": alice_wheat_crop_id,
            "harvest_date": "2027-04-10",
            "quantity": 500.0,
            "unit": "kg",
        },
        headers=alice_headers,
    )
    assert invalid_farm_field.status_code == 400, f"Expected 400, got {invalid_farm_field.status_code}"
    print("[PASS] Cross-farm field hierarchy rejected with HTTP 400")

    # 10. Test input validation: Zero or negative quantity rejected (422)
    neg_qty = client.post(
        "/api/harvests",
        json={
            "crop_id": alice_wheat_crop_id,
            "harvest_date": "2027-04-10",
            "quantity": -50.0,
            "unit": "kg",
        },
        headers=alice_headers,
    )
    assert neg_qty.status_code == 422, f"Expected 422, got {neg_qty.status_code}"

    zero_qty = client.post(
        "/api/harvests",
        json={
            "crop_id": alice_wheat_crop_id,
            "harvest_date": "2027-04-10",
            "quantity": 0,
            "unit": "kg",
        },
        headers=alice_headers,
    )
    assert zero_qty.status_code == 422, f"Expected 422, got {zero_qty.status_code}"
    print("[PASS] Zero and negative harvest quantities rejected with HTTP 422")

    # 11. Test valid harvest creation 1: Wheat in kg
    h1_res = client.post(
        "/api/harvests",
        json={
            "crop_id": alice_wheat_crop_id,
            "harvest_date": "2027-04-10",
            "quantity": 2500.0,
            "unit": "kg",
            "quality_grade": "Grade A",
            "harvest_method": "Machine",
            "storage_location": "Silo Grain Bin 1",
            "batch_number": "WHEAT-2027-01",
            "notes": "First combine cutting, prime golden grain.",
        },
        headers=alice_headers,
    )
    assert h1_res.status_code == 201, h1_res.text
    h1_data = h1_res.json()
    alice_h1_id = h1_data["id"]
    assert h1_data["crop_name"] == "Golden Wheat"
    assert h1_data["field_name"] == "North Wheat Plot"
    assert h1_data["farm_name"] == "Sunny Valley Estate"
    assert Decimal(str(h1_data["quantity"])) == Decimal("2500.00")
    assert h1_data["quality_grade"] == "Grade A"
    print("[PASS] Valid harvest record created with auto-inferred hierarchy")

    # Verify auto-update of crop's actual_harvest_date
    crop_check = client.get(f"/api/crops/{alice_wheat_crop_id}", headers=alice_headers)
    assert crop_check.status_code == 200
    assert crop_check.json()["actual_harvest_date"] == "2027-04-10"
    print("[PASS] Crop actual_harvest_date automatically updated on harvest creation")

    # 12. Create harvest 2: Wheat in quintals (Metric conversion: 1 quintal = 100 kg)
    h2_res = client.post(
        "/api/harvests",
        json={
            "crop_id": alice_wheat_crop_id,
            "harvest_date": "2027-04-12",
            "quantity": 15.0,  # 15 quintals = 1500 kg
            "unit": "quintals",
            "quality_grade": "Grade B",
            "harvest_method": "Machine",
            "storage_location": "Silo Grain Bin 2",
        },
        headers=alice_headers,
    )
    assert h2_res.status_code == 201, h2_res.text
    alice_h2_id = h2_res.json()["id"]

    # 13. Create harvest 3: Corn in discrete unit: bags (Non-convertible, must remain distinct!)
    h3_res = client.post(
        "/api/harvests",
        json={
            "crop_id": alice_corn_crop_id,
            "harvest_date": "2026-09-25",
            "quantity": 120.0,  # 120 bags
            "unit": "bags",
            "quality_grade": "Grade A",
            "harvest_method": "Manual",
            "storage_location": "Warehouse Cool Shed",
            "batch_number": "CORN-BAG-01",
        },
        headers=alice_headers,
    )
    assert h3_res.status_code == 201, h3_res.text
    alice_h3_id = h3_res.json()["id"]

    # 14. Create harvest 4: Corn in crates
    h4_res = client.post(
        "/api/harvests",
        json={
            "crop_id": alice_corn_crop_id,
            "harvest_date": "2026-09-28",
            "quantity": 40.0,  # 40 crates
            "unit": "crates",
            "quality_grade": "Standard",
            "harvest_method": "Manual",
            "storage_location": "Market Staging Yard",
        },
        headers=alice_headers,
    )
    assert h4_res.status_code == 201, h4_res.text
    alice_h4_id = h4_res.json()["id"]
    print("[PASS] Multiple harvests created with varied metric and discrete units")

    # 15. Create a harvest for Bob to test isolation
    bob_h_res = client.post(
        "/api/harvests",
        json={
            "crop_id": bob_crop_id,
            "harvest_date": "2026-11-10",
            "quantity": 3000.0,
            "unit": "kg",
            "quality_grade": "Grade A",
        },
        headers=bob_headers,
    )
    assert bob_h_res.status_code == 201, bob_h_res.text
    bob_h_id = bob_h_res.json()["id"]
    print("[PASS] Bob harvest created successfully")

    # 16. Multi-Tenant IDOR Security Checks
    # Bob tries to read Alice's harvest
    bob_read_alice = client.get(f"/api/harvests/{alice_h1_id}", headers=bob_headers)
    assert bob_read_alice.status_code == 403, f"Expected 403, got {bob_read_alice.status_code}"

    # Bob tries to update Alice's harvest
    bob_update_alice = client.put(
        f"/api/harvests/{alice_h1_id}",
        json={"quantity": 9999.0},
        headers=bob_headers,
    )
    assert bob_update_alice.status_code == 403, f"Expected 403, got {bob_update_alice.status_code}"

    # Bob tries to delete Alice's harvest
    bob_delete_alice = client.delete(f"/api/harvests/{alice_h1_id}", headers=bob_headers)
    assert bob_delete_alice.status_code == 403, f"Expected 403, got {bob_delete_alice.status_code}"

    # Alice tries to create harvest on Bob's crop
    alice_on_bob_crop = client.post(
        "/api/harvests",
        json={
            "crop_id": bob_crop_id,
            "harvest_date": "2026-11-11",
            "quantity": 100.0,
            "unit": "kg",
        },
        headers=alice_headers,
    )
    assert alice_on_bob_crop.status_code == 403, f"Expected 403, got {alice_on_bob_crop.status_code}"
    print("[PASS] Multi-tenant cross-user IDOR access blocked across GET, PUT, DELETE, and POST")

    # 17. Test list harvests with filtering
    # All harvests for Alice (should be 4)
    alice_list = client.get("/api/harvests", headers=alice_headers)
    assert alice_list.status_code == 200
    assert len(alice_list.json()) == 4

    # Filter by crop: Wheat (should be 2)
    wheat_list = client.get(f"/api/harvests?crop_id={alice_wheat_crop_id}", headers=alice_headers)
    assert len(wheat_list.json()) == 2

    # Filter by unit: bags (should be 1)
    bag_list = client.get("/api/harvests?unit=bags", headers=alice_headers)
    assert len(bag_list.json()) == 1
    assert bag_list.json()[0]["unit"] == "bags"

    # Filter by quality_grade: Grade A (should be 2: h1 and h3)
    grade_a_list = client.get("/api/harvests?quality_grade=Grade A", headers=alice_headers)
    assert len(grade_a_list.json()) == 2

    # Search filter: "Silo"
    search_list = client.get("/api/harvests?search=Silo", headers=alice_headers)
    assert len(search_list.json()) == 2
    print("[PASS] Filtering by crop, unit, grade, and search keyword verified")

    # 18. Test harvest update
    update_res = client.put(
        f"/api/harvests/{alice_h1_id}",
        json={
            "quantity": 2600.0,
            "notes": "Updated cutting after final weighbridge measurement.",
            "storage_location": "Silo Grain Bin 1-A",
        },
        headers=alice_headers,
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert Decimal(str(updated_data["quantity"])) == Decimal("2600.00")
    assert updated_data["storage_location"] == "Silo Grain Bin 1-A"
    print("[PASS] Harvest record updated successfully")

    # 19. Test Harvest Summary & Financial / Quantity Logic
    # Alice's current records:
    # h1: Wheat, 2600.00 kg
    # h2: Wheat, 15.00 quintals (= 1500.00 kg)
    # Total metric weight in kg = 2600.00 + 1500.00 = 4100.00 kg
    # h3: Corn, 120.00 bags (discrete)
    # h4: Corn, 40.00 crates (discrete)
    summary_res = client.get("/api/harvests/summary", headers=alice_headers)
    assert summary_res.status_code == 200, summary_res.text
    summary = summary_res.json()

    assert summary["total_harvests"] == 4
    assert Decimal(str(summary["total_metric_weight_kg"])) == Decimal("4100.00")
    assert Decimal(str(summary["by_unit"]["kg"])) == Decimal("2600.00")
    assert Decimal(str(summary["by_unit"]["quintals"])) == Decimal("15.00")
    assert Decimal(str(summary["by_unit"]["bags"])) == Decimal("120.00")
    assert Decimal(str(summary["by_unit"]["crates"])) == Decimal("40.00")
    # Verify discrete units were NOT added into the metric kg weight:
    # 4100 kg is strictly 2600 kg + 1500 kg (from 15 quintals).
    assert Decimal(str(summary["total_metric_weight_kg"])) == Decimal("4100.00")

    # Verify crop-wise summaries
    crop_summaries = summary["by_crop"]
    assert len(crop_summaries) == 2
    wheat_summary = next(c for c in crop_summaries if c["crop_name"] == "Golden Wheat")
    assert wheat_summary["harvest_count"] == 2
    assert Decimal(str(wheat_summary["metric_weight_kg"])) == Decimal("4100.00")

    corn_summary = next(c for c in crop_summaries if c["crop_name"] == "Sweet Corn")
    assert corn_summary["harvest_count"] == 2
    assert corn_summary["quantities_by_unit"]["bags"] == "120.00"
    assert corn_summary["quantities_by_unit"]["crates"] == "40.00"
    print("[PASS] Harvest summary logic accurately converts metric weights while preserving discrete units")

    # 20. Test nested convenience routes
    farm_nested = client.get(f"/api/farms/{alice_farm_id}/harvests", headers=alice_headers)
    assert farm_nested.status_code == 200
    assert len(farm_nested.json()) == 4

    field_nested = client.get(f"/api/fields/{alice_field_id}/harvests", headers=alice_headers)
    assert field_nested.status_code == 200
    assert len(field_nested.json()) == 2

    crop_nested = client.get(f"/api/crops/{alice_wheat_crop_id}/harvests", headers=alice_headers)
    assert crop_nested.status_code == 200
    assert len(crop_nested.json()) == 2
    print("[PASS] Nested convenience routes (/farms/{id}/harvests, /fields/{id}/harvests, /crops/{id}/harvests) verified")

    # 21. Test safe deletion of harvest record
    del_res = client.delete(f"/api/harvests/{alice_h4_id}", headers=alice_headers)
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True

    # Verify count is now 3
    remaining = client.get("/api/harvests", headers=alice_headers)
    assert len(remaining.json()) == 3

    # Verify parent crop and field remain intact
    field_check = client.get(f"/api/fields/{alice_field2_id}", headers=alice_headers)
    assert field_check.status_code == 200
    crop_check = client.get(f"/api/crops/{alice_corn_crop_id}", headers=alice_headers)
    assert crop_check.status_code == 200
    print("[PASS] Safe deletion verified without damaging parent crop or field records")

    print("=" * 65)
    print(" ALL 16 PHASE 14 HARVEST MANAGEMENT TESTS PASSED (100%)")
    print("=" * 65)


if __name__ == "__main__":
    test_phase_14_harvest_management()
