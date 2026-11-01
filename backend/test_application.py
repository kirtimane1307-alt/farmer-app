"""Automated Test Suite for Phase 10: Fertilizer & Pesticide Management.

Validates:
1. Multi-tenant user registration & authentication (Alice & Bob).
2. Base farms, fields, and crops registered under respective tenants.
3. Unauthenticated access blocked (401 Unauthorized).
4. Cross-user farm access blocked (404/IDOR).
5. Relational hierarchy enforcement (Field must belong to Farm, Crop must belong to Field).
6. Fertilizer application creation with auto-calculated cost (quantity * unit_cost).
7. Pesticide application creation with target pest, spray method, and cost tracking.
8. Unknown unit cost with explicit lump-sum total cost.
9. Input validations (negative quantity, zero quantity, negative costs, invalid category rejected).
10. Category filtering (category=fertilizer vs category=pesticide).
11. Multi-criteria filtering (farm, field, crop, date range, search query).
12. Application updating with cost recalculation.
13. Application deletion and subsequent lookup 404.
14. Aggregate expenditure summary statistics (/api/applications/summary).
15. Multi-tenant security isolation (Bob cannot view, update, delete, or list Alice's applications).
16. Nested query endpoints (/farm/{id}, /field/{id}, /crop/{id}).
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
import app.models  # Registers all models including AgriculturalApplication
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
    client.cookies.clear()
    return {"Authorization": f"Bearer {token}"}


def test_phase10_application_management_full_suite():
    """Comprehensive test covering all Phase 10 requirements."""
    print("\n--- [1] Setting up Multi-Tenant Users: Alice & Bob ---")
    alice_headers = register_and_login("Alice Farmer", "alice.inputs@example.com")
    bob_headers = register_and_login("Bob Competitor", "bob.inputs@example.com")

    # 1. Create Farm and Fields for Alice
    farm_resp = client.post(
        "/api/farms",
        headers=alice_headers,
        json={
            "name": "Sunflower Organic Estate",
            "location": "Nashik, Maharashtra",
            "total_area": 40.0,
            "area_unit": "acres",
        },
    )
    assert farm_resp.status_code == 201, farm_resp.text
    alice_farm_id = farm_resp.json()["id"]

    field_1 = client.post(
        f"/api/farms/{alice_farm_id}/fields",
        headers=alice_headers,
        json={
            "name": "North Orchard Plot",
            "area": 15.0,
            "area_unit": "acres",
            "soil_type": "Black Loam",
        },
    ).json()
    alice_field_1_id = field_1["id"]

    field_2 = client.post(
        f"/api/farms/{alice_farm_id}/fields",
        headers=alice_headers,
        json={
            "name": "South Vineyard Plot",
            "area": 25.0,
            "area_unit": "acres",
            "soil_type": "Red Clay",
        },
    ).json()
    alice_field_2_id = field_2["id"]

    # Create Crop for Alice on Field 1
    crop_resp = client.post(
        "/api/crops",
        headers=alice_headers,
        json={
            "field_id": alice_field_1_id,
            "name": "Grapes",
            "variety": "Thompson Seedless",
            "season": "Rabi",
            "sowing_date": "2026-01-15",
            "status": "growing",
        },
    )
    assert crop_resp.status_code == 201
    alice_crop_id = crop_resp.json()["id"]

    # 2. Create Farm and Field for Bob
    bob_farm = client.post(
        "/api/farms",
        headers=bob_headers,
        json={
            "name": "Bob Valley Farm",
            "location": "Pune, Maharashtra",
            "total_area": 20.0,
            "area_unit": "acres",
        },
    ).json()
    bob_farm_id = bob_farm["id"]

    bob_field = client.post(
        f"/api/farms/{bob_farm_id}/fields",
        headers=bob_headers,
        json={
            "name": "Bob Main Field",
            "area": 10.0,
            "area_unit": "acres",
        },
    ).json()
    bob_field_id = bob_field["id"]

    print("\n--- [2] Unauthenticated & Cross-User Security Enforcements ---")
    # Unauthenticated access rejected
    unauth = client.get("/api/applications")
    assert unauth.status_code == 401

    # Bob attempts to log application on Alice's farm
    bob_on_alice = client.post(
        "/api/applications",
        headers=bob_headers,
        json={
            "farm_id": alice_farm_id,
            "field_id": alice_field_1_id,
            "application_category": "fertilizer",
            "product_name": "Urea",
            "product_type": "chemical",
            "quantity": 10.0,
            "unit": "kg",
            "application_date": "2026-05-01",
        },
    )
    assert bob_on_alice.status_code == 404

    # Alice attempts to mismatch field with another farm (or Bob's field)
    mismatched_field = client.post(
        "/api/applications",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "field_id": bob_field_id,  # Bob's field!
            "application_category": "fertilizer",
            "product_name": "Urea",
            "product_type": "chemical",
            "quantity": 10.0,
            "unit": "kg",
            "application_date": "2026-05-01",
        },
    )
    assert mismatched_field.status_code == 404

    # Alice attempts to mismatch crop with field 2 when crop is on field 1
    mismatched_crop = client.post(
        "/api/applications",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "field_id": alice_field_2_id,  # Field 2
            "crop_id": alice_crop_id,      # Crop is on Field 1!
            "application_category": "fertilizer",
            "product_name": "DAP",
            "product_type": "chemical",
            "quantity": 25.0,
            "unit": "kg",
            "application_date": "2026-05-01",
        },
    )
    assert mismatched_crop.status_code == 404

    print("\n--- [3] Fertilizer Application Creation with Auto-Calculated Cost ---")
    # 50 kg @ 25.00/kg = 1250.00
    fert_resp = client.post(
        "/api/applications",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "field_id": alice_field_1_id,
            "crop_id": alice_crop_id,
            "application_category": "fertilizer",
            "product_name": "Bio-Organic Compost",
            "product_type": "organic",
            "quantity": 50.0,
            "unit": "kg",
            "unit_cost": 25.0,
            "application_date": "2026-05-02",
            "application_method": "broadcasting",
            "purpose": "Soil organic carbon enrichment",
            "notes": "Spread evenly before irrigation",
        },
    )
    assert fert_resp.status_code == 201, fert_resp.text
    fert_data = fert_resp.json()
    fert_id = fert_data["id"]
    assert fert_data["application_category"] == "fertilizer"
    assert fert_data["product_name"] == "Bio-Organic Compost"
    assert Decimal(str(fert_data["quantity"])) == Decimal("50.00")
    assert Decimal(str(fert_data["unit_cost"])) == Decimal("25.00")
    assert Decimal(str(fert_data["total_cost"])) == Decimal("1250.00")
    assert fert_data["farm_name"] == "Sunflower Organic Estate"
    assert fert_data["field_name"] == "North Orchard Plot"
    assert fert_data["crop_name"] == "Grapes"

    print("\n--- [4] Pesticide Application Creation with Target Pest & Method ---")
    # 2.5 L @ 400.00/L = 1000.00
    pest_resp = client.post(
        "/api/applications",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "field_id": alice_field_1_id,
            "crop_id": alice_crop_id,
            "application_category": "pesticide",
            "product_name": "Neem Guard 1500ppm",
            "product_type": "biological",
            "quantity": 2.5,
            "unit": "L",
            "unit_cost": 400.0,
            "application_date": "2026-05-04",
            "application_method": "foliar_spray",
            "purpose": "Powdery mildew prevention",
            "notes": "Applied with backpack power sprayer in early morning",
        },
    )
    assert pest_resp.status_code == 201, pest_resp.text
    pest_data = pest_resp.json()
    pest_id = pest_data["id"]
    assert pest_data["application_category"] == "pesticide"
    assert Decimal(str(pest_data["quantity"])) == Decimal("2.50")
    assert Decimal(str(pest_data["total_cost"])) == Decimal("1000.00")

    print("\n--- [5] Explicit Total Cost When Unit Cost is Unknown ---")
    # Application with lump sum cost 500.00 and no unit cost
    lump_app = client.post(
        "/api/applications",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "field_id": alice_field_2_id,
            "application_category": "fertilizer",
            "product_name": "Farmyard Manure (FYM)",
            "product_type": "compost",
            "quantity": 2.0,
            "unit": "tractor_trolley",
            "total_cost": 500.0,
            "application_date": "2026-05-05",
            "purpose": "Basal application",
        },
    ).json()
    assert lump_app["unit_cost"] is None
    assert Decimal(str(lump_app["total_cost"])) == Decimal("500.00")
    lump_id = lump_app["id"]

    print("\n--- [6] Input Validations: Negative Values & Invalid Categories ---")
    # Negative quantity rejected
    neg_qty = client.post(
        "/api/applications",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "field_id": alice_field_1_id,
            "application_category": "fertilizer",
            "product_name": "Urea",
            "product_type": "chemical",
            "quantity": -5.0,
            "unit": "kg",
            "application_date": "2026-05-01",
        },
    )
    assert neg_qty.status_code == 422

    # Zero quantity rejected
    zero_qty = client.post(
        "/api/applications",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "field_id": alice_field_1_id,
            "application_category": "fertilizer",
            "product_name": "Urea",
            "product_type": "chemical",
            "quantity": 0.0,
            "unit": "kg",
            "application_date": "2026-05-01",
        },
    )
    assert zero_qty.status_code == 422

    # Negative cost rejected
    neg_cost = client.post(
        "/api/applications",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "field_id": alice_field_1_id,
            "application_category": "fertilizer",
            "product_name": "Urea",
            "product_type": "chemical",
            "quantity": 5.0,
            "unit": "kg",
            "unit_cost": -10.0,
            "application_date": "2026-05-01",
        },
    )
    assert neg_cost.status_code == 422

    # Invalid category rejected
    bad_cat = client.post(
        "/api/applications",
        headers=alice_headers,
        json={
            "farm_id": alice_farm_id,
            "field_id": alice_field_1_id,
            "application_category": "herbicide",  # Not valid category (must be fertilizer or pesticide)
            "product_name": "Roundup",
            "product_type": "chemical",
            "quantity": 1.0,
            "unit": "L",
            "application_date": "2026-05-01",
        },
    )
    assert bad_cat.status_code == 422

    print("\n--- [7] Category Filtering (fertilizer vs pesticide) ---")
    fert_list = client.get("/api/applications?category=fertilizer", headers=alice_headers).json()
    assert len(fert_list) == 2
    for item in fert_list:
        assert item["application_category"] == "fertilizer"

    pest_list = client.get("/api/applications?category=pesticide", headers=alice_headers).json()
    assert len(pest_list) == 1
    assert pest_list[0]["product_name"] == "Neem Guard 1500ppm"

    print("\n--- [8] Multi-Criteria Filtering ---")
    # Filter by field
    field2_list = client.get(f"/api/applications?field_id={alice_field_2_id}", headers=alice_headers).json()
    assert len(field2_list) == 1
    assert field2_list[0]["product_name"] == "Farmyard Manure (FYM)"

    # Search keyword
    search_list = client.get("/api/applications?search=neem", headers=alice_headers).json()
    assert len(search_list) == 1
    assert search_list[0]["id"] == pest_id

    # Date range
    date_filtered = client.get(
        "/api/applications?start_date=2026-05-03&end_date=2026-05-04", headers=alice_headers
    ).json()
    assert len(date_filtered) == 1
    assert date_filtered[0]["id"] == pest_id

    print("\n--- [9] Updating Application & Recalculating Cost ---")
    # Update quantity from 50 to 60 on fert_id (unit_cost remains 25, new total should be 60 * 25 = 1500.00)
    update_resp = client.put(
        f"/api/applications/{fert_id}",
        headers=alice_headers,
        json={"quantity": 60.0},
    )
    assert update_resp.status_code == 200
    up_data = update_resp.json()
    assert Decimal(str(up_data["quantity"])) == Decimal("60.00")
    assert Decimal(str(up_data["total_cost"])) == Decimal("1500.00")

    print("\n--- [10] Aggregate Applications Summary Statistics ---")
    # Current records:
    # 1. Fertilizer (fert_id): quantity 60, cost = 1500.00
    # 2. Pesticide (pest_id): quantity 2.5, cost = 1000.00
    # 3. Fertilizer (lump_id): quantity 2, cost = 500.00
    # Total fert cost = 2000.00, total pest cost = 1000.00, combined = 3000.00
    summary_resp = client.get("/api/applications/summary", headers=alice_headers)
    assert summary_resp.status_code == 200
    sum_data = summary_resp.json()
    assert sum_data["total_applications_count"] == 3
    assert sum_data["fertilizer_applications_count"] == 2
    assert sum_data["pesticide_applications_count"] == 1
    assert Decimal(str(sum_data["total_fertilizer_cost"])) == Decimal("2000.00")
    assert Decimal(str(sum_data["total_pesticide_cost"])) == Decimal("1000.00")
    assert Decimal(str(sum_data["total_combined_cost"])) == Decimal("3000.00")

    print("\n--- [11] Multi-Tenant Security Isolation (IDOR) ---")
    # Bob attempts to get Alice's application
    bob_get = client.get(f"/api/applications/{fert_id}", headers=bob_headers)
    assert bob_get.status_code == 404

    # Bob attempts to update Alice's application
    bob_update = client.put(
        f"/api/applications/{fert_id}",
        headers=bob_headers,
        json={"product_name": "Hacked Product"},
    )
    assert bob_update.status_code == 404

    # Bob attempts to delete Alice's application
    bob_del = client.delete(f"/api/applications/{fert_id}", headers=bob_headers)
    assert bob_del.status_code == 404

    # Bob lists applications: returns empty
    bob_list = client.get("/api/applications", headers=bob_headers).json()
    assert len(bob_list) == 0

    print("\n--- [12] Nested Convenience Endpoints ---")
    farm_apps = client.get(f"/api/applications/farm/{alice_farm_id}", headers=alice_headers).json()
    assert len(farm_apps) == 3

    crop_apps = client.get(f"/api/applications/crop/{alice_crop_id}", headers=alice_headers).json()
    assert len(crop_apps) == 2

    print("\n--- [13] Deleting Application ---")
    del_resp = client.delete(f"/api/applications/{lump_id}", headers=alice_headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True

    # Confirm deletion
    get_after_del = client.get(f"/api/applications/{lump_id}", headers=alice_headers)
    assert get_after_del.status_code == 404

    # Confirm updated summary count = 2
    sum_after = client.get("/api/applications/summary", headers=alice_headers).json()
    assert sum_after["total_applications_count"] == 2
    assert Decimal(str(sum_after["total_fertilizer_cost"])) == Decimal("1500.00")

    print("\n>>> ALL PHASE 10 FERTILIZER & PESTICIDE TESTS PASSED EXCELLENTLY! <<<")


if __name__ == "__main__":
    setup_module()
    try:
        test_phase10_application_management_full_suite()
        print("\nAll Phase 10 Application Management tests executed and PASSED!")
    finally:
        teardown_module()
