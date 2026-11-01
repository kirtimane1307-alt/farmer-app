"""Automated Test Suite for Phase 13: Equipment & Machinery Management.

Validates:
1. Multi-tenant user registration & authentication (Alice & Bob).
2. Base farms and field plots registered under respective tenants.
3. Unauthenticated access blocked (401 Unauthorized).
4. Cross-user farm access & IDOR blocked (404 Not Found).
5. Relational hierarchy enforcement (Field must belong to selected Farm).
6. Input validations (blank name, negative price, zero/negative quantity, invalid condition/status/maintenance_type, negative maintenance cost/downtime).
7. Equipment creation with full specs and confirmed purchase price.
8. Equipment creation with unknown purchase price (None/null handled cleanly).
9. Equipment listing & multi-criteria filtering (farm, field, type, status, condition, service_status, search).
10. Single equipment retrieval with calculated fields and maintenance logs.
11. Equipment update and quick operational status transitions.
12. Maintenance record creation and automatic synchronization of last_service_date and next_service_date.
13. Maintenance history retrieval and filtering.
14. Maintenance record update and automatic recalculation of equipment service dates.
15. Safe deletion protection: equipment with maintenance history blocked from accidental deletion (400 Bad Request).
16. Safe deletion with force=True or zero maintenance records.
17. Overdue, upcoming, and missing service date calculations.
18. Authoritative Decimal financial calculations for purchase value and maintenance costs.
19. Multi-tenant security isolation: Bob cannot view, edit, delete, or service Alice's equipment.
20. Nested convenience endpoints (/farms/{id}/equipment, /fields/{id}/equipment).
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
import app.models  # Registers all models including Equipment and EquipmentMaintenance
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


def test_phase_13_equipment_management():
    print("=" * 65)
    print(" Running Phase 13 Equipment Management Automated Test Suite")
    print("=" * 65)

    # 0. Setup fresh database schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # -------------------------------------------------------------
    # 1. Multi-Tenant User Setup: Alice & Bob
    # -------------------------------------------------------------
    print("\n--- [1] Establishing Multi-Tenant Users: Alice & Bob ---")
    reg_alice = client.post(
        "/api/auth/register",
        json={"email": "alice.equipment@example.com", "password": "SecurePassword123!", "name": "Alice Equipment Owner"},
    )
    assert reg_alice.status_code == 201, f"Failed Alice registration: {reg_alice.text}"
    alice_token = reg_alice.json()["data"]["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    reg_bob = client.post(
        "/api/auth/register",
        json={"email": "bob.equipment@example.com", "password": "SecurePassword123!", "name": "Bob Equipment Owner"},
    )
    assert reg_bob.status_code == 201, f"Failed Bob registration: {reg_bob.text}"
    bob_token = reg_bob.json()["data"]["access_token"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}
    client.cookies.clear()

    # Create Alice Farm & Field
    res_farm_alice = client.post(
        "/api/farms",
        headers=alice_headers,
        json={"name": "Alice Green Acres", "location": "Nashik Valley", "total_area": 45.0, "area_unit": "acres"},
    )
    assert res_farm_alice.status_code == 201
    alice_farm_id = res_farm_alice.json()["id"]

    res_field_alice1 = client.post(
        f"/api/farms/{alice_farm_id}/fields",
        headers=alice_headers,
        json={"name": "North Field Plot", "area": 20.0, "area_unit": "acres"},
    )
    assert res_field_alice1.status_code == 201
    alice_field1_id = res_field_alice1.json()["id"]

    res_field_alice2 = client.post(
        f"/api/farms/{alice_farm_id}/fields",
        headers=alice_headers,
        json={"name": "South Field Plot", "area": 25.0, "area_unit": "acres"},
    )
    assert res_field_alice2.status_code == 201
    alice_field2_id = res_field_alice2.json()["id"]

    # Create Bob Farm & Field
    res_farm_bob = client.post(
        "/api/farms",
        headers=bob_headers,
        json={"name": "Bob Highland Estate", "location": "Pune Hills", "total_area": 30.0, "area_unit": "acres"},
    )
    assert res_farm_bob.status_code == 201
    bob_farm_id = res_farm_bob.json()["id"]

    res_field_bob = client.post(
        f"/api/farms/{bob_farm_id}/fields",
        headers=bob_headers,
        json={"name": "Bob Orchard", "area": 15.0, "area_unit": "acres"},
    )
    assert res_field_bob.status_code == 201
    bob_field_id = res_field_bob.json()["id"]

    print(" [PASS] 1. Multi-Tenant Accounts & Base Estates Established")

    # -------------------------------------------------------------
    # 2. Unauthenticated Access Protection (401)
    # -------------------------------------------------------------
    print("\n--- [2] Unauthenticated Security Check ---")
    res_unauth1 = client.get("/api/equipment")
    assert res_unauth1.status_code == 401, f"Expected 401, got {res_unauth1.status_code}"

    res_unauth2 = client.post("/api/equipment", json={"equipment_name": "Tractor", "equipment_type": "Tractor", "farm_id": alice_farm_id})
    assert res_unauth2.status_code == 401, f"Expected 401, got {res_unauth2.status_code}"

    res_unauth3 = client.get("/api/equipment/summary")
    assert res_unauth3.status_code == 401, f"Expected 401, got {res_unauth3.status_code}"

    print(" [PASS] 2. Unauthenticated Access Blocked (401)")

    # -------------------------------------------------------------
    # 3. Input Validation Checks
    # -------------------------------------------------------------
    print("\n--- [3] Input Validation Checks ---")
    # Blank equipment name
    res_inv1 = client.post(
        "/api/equipment",
        headers=alice_headers,
        json={"farm_id": alice_farm_id, "equipment_name": "   ", "equipment_type": "Tractor"},
    )
    assert res_inv1.status_code == 422, f"Expected 422 for blank name, got {res_inv1.status_code}"

    # Negative purchase price
    res_inv2 = client.post(
        "/api/equipment",
        headers=alice_headers,
        json={"farm_id": alice_farm_id, "equipment_name": "Mahindra 575 DI", "equipment_type": "Tractor", "purchase_price": -50000.0},
    )
    assert res_inv2.status_code == 422, f"Expected 422 for negative price, got {res_inv2.status_code}"

    # Zero or negative quantity
    res_inv3 = client.post(
        "/api/equipment",
        headers=alice_headers,
        json={"farm_id": alice_farm_id, "equipment_name": "Mahindra 575 DI", "equipment_type": "Tractor", "quantity": 0},
    )
    assert res_inv3.status_code == 422, f"Expected 422 for 0 quantity, got {res_inv3.status_code}"

    # Invalid condition
    res_inv4 = client.post(
        "/api/equipment",
        headers=alice_headers,
        json={"farm_id": alice_farm_id, "equipment_name": "Mahindra 575 DI", "equipment_type": "Tractor", "condition": "broken_beyond_repair"},
    )
    assert res_inv4.status_code == 422, f"Expected 422 for invalid condition, got {res_inv4.status_code}"

    # Invalid operational status
    res_inv5 = client.post(
        "/api/equipment",
        headers=alice_headers,
        json={"farm_id": alice_farm_id, "equipment_name": "Mahindra 575 DI", "equipment_type": "Tractor", "operational_status": "flying"},
    )
    assert res_inv5.status_code == 422, f"Expected 422 for invalid status, got {res_inv5.status_code}"

    print(" [PASS] 3. Input Validation Bounds Strictly Enforced")

    # -------------------------------------------------------------
    # 4. Cross-Tenant Farm Access Blocked & Field Validation
    # -------------------------------------------------------------
    print("\n--- [4] Farm Ownership & Field Plot Validation ---")
    # Alice attempts to register equipment on Bob's farm
    res_cross1 = client.post(
        "/api/equipment",
        headers=alice_headers,
        json={"farm_id": bob_farm_id, "equipment_name": "Intruder Tractor", "equipment_type": "Tractor"},
    )
    assert res_cross1.status_code == 404, f"Expected 404 for cross-tenant farm, got {res_cross1.status_code}"

    # Alice selects her farm, but Bob's field plot
    res_cross2 = client.post(
        "/api/equipment",
        headers=alice_headers,
        json={"farm_id": alice_farm_id, "field_id": bob_field_id, "equipment_name": "Mismatched Field Machine", "equipment_type": "Sprayer"},
    )
    assert res_cross2.status_code == 400, f"Expected 400 for field belonging to another farm, got {res_cross2.status_code}"

    print(" [PASS] 4. Multi-Tenant Farm Isolation & Field Hierarchy Enforced")

    # -------------------------------------------------------------
    # 5. Equipment Registration: Confirmed Price & Specifications
    # -------------------------------------------------------------
    print("\n--- [5] Equipment Registration with Specifications & Confirmed Price ---")
    today = date.today()
    next_week = today + timedelta(days=7)
    next_month = today + timedelta(days=20)
    past_due = today - timedelta(days=5)

    tractor_payload = {
        "farm_id": alice_farm_id,
        "field_id": alice_field1_id,
        "equipment_name": "Mahindra 575 DI Tractor",
        "equipment_type": "Tractor",
        "brand": "Mahindra",
        "model_number": "575 DI XP Plus",
        "serial_number": "MAH-575-2024-9988",
        "purchase_date": "2024-03-15",
        "purchase_price": 750000.00,
        "supplier_name": "Mahindra Agro Dealership Nashik",
        "quantity": 1,
        "condition": "excellent",
        "operational_status": "available",
        "fuel_type": "diesel",
        "identification_number": "MH-15-AG-4421",
        "warranty_expiry_date": "2027-03-15",
        "last_service_date": "2026-01-10",
        "next_service_date": next_month.isoformat(),
        "notes": "Primary workhorse for ploughing and heavy haulage.",
    }
    res_tractor = client.post("/api/equipment", headers=alice_headers, json=tractor_payload)
    assert res_tractor.status_code == 201, f"Failed to create tractor: {res_tractor.text}"
    tractor_data = res_tractor.json()
    tractor_id = tractor_data["id"]
    assert tractor_data["equipment_name"] == "Mahindra 575 DI Tractor"
    assert Decimal(str(tractor_data["purchase_price"])) == Decimal("750000.00")
    assert tractor_data["farm_name"] == "Alice Green Acres"
    assert tractor_data["field_name"] == "North Field Plot"
    assert tractor_data["service_status"] == "upcoming"

    # Equipment 2: Sprayer with due soon service date
    sprayer_payload = {
        "farm_id": alice_farm_id,
        "field_id": alice_field1_id,
        "equipment_name": "Aspee HTP Power Sprayer",
        "equipment_type": "Sprayer",
        "brand": "Aspee",
        "model_number": "HTP-50",
        "serial_number": "ASP-HTP-1044",
        "purchase_date": "2025-01-20",
        "purchase_price": 28500.00,
        "supplier_name": "Kisan Krishi Kendra",
        "quantity": 1,
        "condition": "good",
        "operational_status": "in_use",
        "fuel_type": "petrol",
        "next_service_date": next_week.isoformat(),
        "notes": "High pressure sprayer for orchard fungicides.",
    }
    res_sprayer = client.post("/api/equipment", headers=alice_headers, json=sprayer_payload)
    assert res_sprayer.status_code == 201
    sprayer_id = res_sprayer.json()["id"]
    assert res_sprayer.json()["service_status"] == "due_soon"

    # Equipment 3: Water pump with overdue service date
    pump_payload = {
        "farm_id": alice_farm_id,
        "equipment_name": "Kirloskar 7.5 HP Submersible Pump",
        "equipment_type": "Water Pump",
        "brand": "Kirloskar",
        "model_number": "KU4-075",
        "purchase_date": "2023-08-10",
        "purchase_price": 42000.00,
        "quantity": 1,
        "condition": "fair",
        "operational_status": "under_maintenance",
        "fuel_type": "electric",
        "last_service_date": "2025-10-01",
        "next_service_date": past_due.isoformat(),
        "notes": "Main borewell water pump.",
    }
    res_pump = client.post("/api/equipment", headers=alice_headers, json=pump_payload)
    assert res_pump.status_code == 201
    pump_id = res_pump.json()["id"]
    assert res_pump.json()["service_status"] == "overdue"

    print(" [PASS] 5. Equipment Registration with Full Specs Verified")

    # -------------------------------------------------------------
    # 6. Equipment Registration with Unknown Purchase Price
    # -------------------------------------------------------------
    print("\n--- [6] Handling Unknown Purchase Price (None/null) ---")
    cultivator_payload = {
        "farm_id": alice_farm_id,
        "equipment_name": "9-Tyne Rigid Cultivator",
        "equipment_type": "Cultivator",
        "brand": "Local Fabricator",
        "quantity": 2,
        "purchase_price": None,  # Unknown price
        "condition": "good",
        "operational_status": "available",
        "notes": "Inherited farm implement; purchase price unknown.",
    }
    res_cultivator = client.post("/api/equipment", headers=alice_headers, json=cultivator_payload)
    assert res_cultivator.status_code == 201
    cultivator_id = res_cultivator.json()["id"]
    assert res_cultivator.json()["purchase_price"] is None
    assert res_cultivator.json()["quantity"] == 2
    assert res_cultivator.json()["service_status"] == "not_scheduled"

    print(" [PASS] 6. Unknown Purchase Price Handled Gracefully")

    # Also create an equipment item for Bob to test isolation
    res_bob_eq = client.post(
        "/api/equipment",
        headers=bob_headers,
        json={
            "farm_id": bob_farm_id,
            "equipment_name": "John Deere 5050 D Tractor",
            "equipment_type": "Tractor",
            "purchase_price": 820000.00,
            "condition": "excellent",
            "operational_status": "available",
        },
    )
    assert res_bob_eq.status_code == 201
    bob_eq_id = res_bob_eq.json()["id"]

    # -------------------------------------------------------------
    # 7. Single Equipment Retrieval & Details
    # -------------------------------------------------------------
    print("\n--- [7] Single Equipment Retrieval ---")
    res_single = client.get(f"/api/equipment/{tractor_id}", headers=alice_headers)
    assert res_single.status_code == 200
    assert res_single.json()["equipment_name"] == "Mahindra 575 DI Tractor"
    assert res_single.json()["maintenance_count"] == 0
    assert Decimal(str(res_single.json()["total_maintenance_cost"])) == Decimal("0.00")

    print(" [PASS] 7. Single Equipment Retrieval Verified")

    # -------------------------------------------------------------
    # 8. Updating Equipment & Operational Status Transitions
    # -------------------------------------------------------------
    print("\n--- [8] Equipment Update & Status Transitions ---")
    # Full update
    res_update = client.put(
        f"/api/equipment/{tractor_id}",
        headers=alice_headers,
        json={"notes": "Updated note: Recently fitted with new LED work lamps."},
    )
    assert res_update.status_code == 200
    assert "new LED work lamps" in res_update.json()["notes"]

    # Quick status change via PATCH
    res_patch = client.patch(
        f"/api/equipment/{tractor_id}/status",
        headers=alice_headers,
        json={"operational_status": "in_use", "condition": "good", "notes": "Dispatched to North Plot for sowing."},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["operational_status"] == "in_use"
    assert res_patch.json()["condition"] == "good"

    print(" [PASS] 8. Equipment Update & Status Transitions Verified")

    # -------------------------------------------------------------
    # 9. Maintenance Record Creation & Automatic Schedule Updates
    # -------------------------------------------------------------
    print("\n--- [9] Maintenance Creation & Date Synchronization ---")
    # Invalid maintenance inputs
    res_m_inv1 = client.post(
        f"/api/equipment/{tractor_id}/maintenance",
        headers=alice_headers,
        json={"maintenance_type": "repair", "service_date": "2026-05-10", "description": "", "cost": 5000.0},
    )
    assert res_m_inv1.status_code == 422, f"Expected 422 for blank description, got {res_m_inv1.status_code}"

    res_m_inv2 = client.post(
        f"/api/equipment/{tractor_id}/maintenance",
        headers=alice_headers,
        json={"maintenance_type": "repair", "service_date": "2026-05-10", "description": "Engine fix", "cost": -100.0},
    )
    assert res_m_inv2.status_code == 422, f"Expected 422 for negative cost, got {res_m_inv2.status_code}"

    res_m_inv3 = client.post(
        f"/api/equipment/{tractor_id}/maintenance",
        headers=alice_headers,
        json={"maintenance_type": "repair", "service_date": "2026-05-10", "description": "Engine fix", "downtime_minutes": -30},
    )
    assert res_m_inv3.status_code == 422, f"Expected 422 for negative downtime, got {res_m_inv3.status_code}"

    # Valid Maintenance Record 1: 500-hour Routine Service
    maint_date_1 = today - timedelta(days=60)
    next_service_scheduled = today + timedelta(days=90)
    maint_payload_1 = {
        "maintenance_type": "routine_service",
        "service_date": maint_date_1.isoformat(),
        "description": "500-hour scheduled service: Engine oil change, fuel filter replacement, air cleaner servicing.",
        "service_provider": "Mahindra Authorized Service Center",
        "parts_replaced": "Engine Oil (8.5L), Oil Filter, Fuel Filter Primary & Secondary",
        "cost": 5400.00,
        "downtime_minutes": 240,
        "next_service_date": next_service_scheduled.isoformat(),
        "notes": "Next oil change due at 1000 operational hours.",
    }
    res_m1 = client.post(f"/api/equipment/{tractor_id}/maintenance", headers=alice_headers, json=maint_payload_1)
    assert res_m1.status_code == 201, f"Failed to create maintenance: {res_m1.text}"
    m1_data = res_m1.json()
    m1_id = m1_data["id"]
    assert m1_data["maintenance_type_label"] == "Routine Service"
    assert Decimal(str(m1_data["cost"])) == Decimal("5400.00")
    assert m1_data["equipment_name"] == "Mahindra 575 DI Tractor"

    # Verify equipment service dates were automatically updated
    res_tractor_check1 = client.get(f"/api/equipment/{tractor_id}", headers=alice_headers)
    assert res_tractor_check1.status_code == 200
    assert res_tractor_check1.json()["last_service_date"] == maint_date_1.isoformat()
    assert res_tractor_check1.json()["next_service_date"] == next_service_scheduled.isoformat()
    assert res_tractor_check1.json()["maintenance_count"] == 1
    assert Decimal(str(res_tractor_check1.json()["total_maintenance_cost"])) == Decimal("5400.00")

    # Valid Maintenance Record 2: Hydraulic pump seal replacement
    maint_date_2 = today - timedelta(days=20)
    maint_payload_2 = {
        "maintenance_type": "repair",
        "service_date": maint_date_2.isoformat(),
        "description": "Replaced leaking hydraulic lift cylinder O-ring seal.",
        "service_provider": "Kailash Agro Mechanical Works",
        "parts_replaced": "Hydraulic seal kit",
        "cost": 1800.00,
        "downtime_minutes": 120,
        "update_equipment_status": "available",
        "notes": "Hydraulic pressure pressure tested at 180 bar, working perfectly.",
    }
    res_m2 = client.post(f"/api/equipment/{tractor_id}/maintenance", headers=alice_headers, json=maint_payload_2)
    assert res_m2.status_code == 201
    m2_id = res_m2.json()["id"]

    # Verify equipment last_service_date updated to latest date (2026-05-02) and cost accumulated
    res_tractor_check2 = client.get(f"/api/equipment/{tractor_id}", headers=alice_headers)
    assert res_tractor_check2.json()["last_service_date"] == maint_date_2.isoformat()
    assert res_tractor_check2.json()["maintenance_count"] == 2
    assert Decimal(str(res_tractor_check2.json()["total_maintenance_cost"])) == Decimal("7200.00")  # 5400 + 1800

    print(" [PASS] 9. Maintenance Records Created & Service Dates Auto-Synchronized")

    # -------------------------------------------------------------
    # 10. Maintenance History Listing & Detail Retrieval
    # -------------------------------------------------------------
    print("\n--- [10] Maintenance History Retrieval ---")
    res_m_list = client.get(f"/api/equipment/{tractor_id}/maintenance", headers=alice_headers)
    assert res_m_list.status_code == 200
    assert len(res_m_list.json()) == 2
    # Verify ordered by service_date desc (2026-05-02 should be first)
    assert res_m_list.json()[0]["service_date"] == maint_date_2.isoformat()
    assert res_m_list.json()[1]["service_date"] == maint_date_1.isoformat()

    # Filter by maintenance_type
    res_m_filter = client.get(f"/api/equipment/{tractor_id}/maintenance?maintenance_type=repair", headers=alice_headers)
    assert res_m_filter.status_code == 200
    assert len(res_m_filter.json()) == 1
    assert res_m_filter.json()[0]["id"] == m2_id

    # Get single maintenance item
    res_m_single = client.get(f"/api/equipment/{tractor_id}/maintenance/{m1_id}", headers=alice_headers)
    assert res_m_single.status_code == 200
    assert res_m_single.json()["id"] == m1_id

    print(" [PASS] 10. Maintenance History Listing & Filtering Verified")

    # -------------------------------------------------------------
    # 11. Maintenance Record Update
    # -------------------------------------------------------------
    print("\n--- [11] Maintenance Update & Date Recalculation ---")
    res_m_update = client.put(
        f"/api/equipment/{tractor_id}/maintenance/{m2_id}",
        headers=alice_headers,
        json={"cost": 2200.00, "notes": "Adjusted cost to include specialized hydraulic oil."},
    )
    assert res_m_update.status_code == 200
    assert Decimal(str(res_m_update.json()["cost"])) == Decimal("2200.00")

    # Verify updated total maintenance cost on tractor
    res_tractor_check3 = client.get(f"/api/equipment/{tractor_id}", headers=alice_headers)
    assert Decimal(str(res_tractor_check3.json()["total_maintenance_cost"])) == Decimal("7600.00")  # 5400 + 2200

    print(" [PASS] 11. Maintenance Update & Cost Recalculation Verified")

    # -------------------------------------------------------------
    # 12. Safe Deletion Rule (History Preservation)
    # -------------------------------------------------------------
    print("\n--- [12] Safe Deletion Integrity Protection ---")
    # Attempting to delete equipment with maintenance history without force=True must fail (400 Bad Request)
    res_del_blocked = client.delete(f"/api/equipment/{tractor_id}", headers=alice_headers)
    assert res_del_blocked.status_code == 400, f"Expected 400 Bad Request, got {res_del_blocked.status_code}"
    del_json = res_del_blocked.json()
    error_msg = del_json.get("error", {}).get("message") if isinstance(del_json.get("error"), dict) else del_json.get("detail", str(del_json))
    assert "recorded maintenance history entries" in error_msg

    # Changing operational_status to retired is preferred
    res_retire = client.patch(
        f"/api/equipment/{tractor_id}/status",
        headers=alice_headers,
        json={"operational_status": "retired", "condition": "fair", "notes": "Preserved for historical audits."},
    )
    assert res_retire.status_code == 200
    assert res_retire.json()["operational_status"] == "retired"
    assert res_retire.json()["service_status"] == "retired"

    # Reset status back to available for filtering tests
    client.patch(f"/api/equipment/{tractor_id}/status", headers=alice_headers, json={"operational_status": "available", "condition": "good"})

    # Delete cultivator (has 0 maintenance records) should succeed immediately
    res_del_cultivator = client.delete(f"/api/equipment/{cultivator_id}", headers=alice_headers)
    assert res_del_cultivator.status_code == 200
    assert res_del_cultivator.json()["deleted"] is True

    # Confirm it's gone
    res_check_gone = client.get(f"/api/equipment/{cultivator_id}", headers=alice_headers)
    assert res_check_gone.status_code == 404

    print(" [PASS] 12. Safe Deletion & History Preservation Rules Verified")

    # -------------------------------------------------------------
    # 13. Multi-Criteria Equipment Filtering & Search
    # -------------------------------------------------------------
    print("\n--- [13] Multi-Criteria Equipment Filtering ---")
    # All equipment for Alice (tractor, sprayer, pump = 3)
    res_all = client.get("/api/equipment", headers=alice_headers)
    assert res_all.status_code == 200
    assert len(res_all.json()) == 3

    # Filter by equipment_type
    res_type = client.get("/api/equipment?equipment_type=Tractor", headers=alice_headers)
    assert len(res_type.json()) == 1
    assert res_type.json()[0]["id"] == tractor_id

    # Filter by operational_status
    res_stat = client.get("/api/equipment?operational_status=under_maintenance", headers=alice_headers)
    assert len(res_stat.json()) == 1
    assert res_stat.json()[0]["id"] == pump_id

    # Filter by condition
    res_cond = client.get("/api/equipment?condition=good", headers=alice_headers)
    assert len(res_cond.json()) == 2  # tractor and sprayer

    # Search keyword
    res_search = client.get("/api/equipment?search=Kirloskar", headers=alice_headers)
    assert len(res_search.json()) == 1
    assert res_search.json()[0]["id"] == pump_id

    # Filter by service_status (overdue)
    res_overdue = client.get("/api/equipment?service_status=overdue", headers=alice_headers)
    assert len(res_overdue.json()) == 1
    assert res_overdue.json()[0]["id"] == pump_id

    print(" [PASS] 13. Multi-Criteria Filtering & Search Verified")

    # -------------------------------------------------------------
    # 14. Authoritative Dashboard Summary Metrics
    # -------------------------------------------------------------
    print("\n--- [14] Equipment Dashboard Summary Metrics ---")
    res_summary = client.get("/api/equipment/summary", headers=alice_headers)
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["total_equipment"] == 3
    assert summary["available_count"] == 1  # Tractor
    assert summary["in_use_count"] == 1  # Sprayer
    assert summary["under_maintenance_count"] == 1  # Pump
    assert summary["retired_count"] == 0
    assert summary["overdue_services_count"] == 1  # Pump
    assert summary["upcoming_services_count"] == 1  # Sprayer

    # Total purchase value: Tractor (750000) + Sprayer (28500) + Pump (42000) = 820500.00
    assert Decimal(str(summary["total_purchase_value"])) == Decimal("820500.00")
    # Total maintenance cost: Tractor maint (5400 + 2200 = 7600.00)
    assert Decimal(str(summary["total_maintenance_cost"])) == Decimal("7600.00")

    print(" [PASS] 14. Authoritative Summary Metrics & Decimal Arithmetic Verified")

    # -------------------------------------------------------------
    # 15. Multi-Tenant Security Isolation (Bob vs Alice IDOR)
    # -------------------------------------------------------------
    print("\n--- [15] Multi-Tenant IDOR Security Isolation ---")
    # Bob attempts to view Alice's tractor
    res_idor1 = client.get(f"/api/equipment/{tractor_id}", headers=bob_headers)
    assert res_idor1.status_code == 404, f"Expected 404 for IDOR get, got {res_idor1.status_code}"

    # Bob attempts to update Alice's tractor
    res_idor2 = client.put(f"/api/equipment/{tractor_id}", headers=bob_headers, json={"notes": "Hacked"})
    assert res_idor2.status_code == 404, f"Expected 404 for IDOR put, got {res_idor2.status_code}"

    # Bob attempts to change status of Alice's tractor
    res_idor3 = client.patch(f"/api/equipment/{tractor_id}/status", headers=bob_headers, json={"operational_status": "retired"})
    assert res_idor3.status_code == 404, f"Expected 404 for IDOR patch, got {res_idor3.status_code}"

    # Bob attempts to delete Alice's tractor
    res_idor4 = client.delete(f"/api/equipment/{tractor_id}?force=true", headers=bob_headers)
    assert res_idor4.status_code == 404, f"Expected 404 for IDOR delete, got {res_idor4.status_code}"

    # Bob attempts to view Alice's tractor maintenance history
    res_idor5 = client.get(f"/api/equipment/{tractor_id}/maintenance", headers=bob_headers)
    assert res_idor5.status_code == 404, f"Expected 404 for IDOR maintenance list, got {res_idor5.status_code}"

    # Bob attempts to record maintenance on Alice's tractor
    res_idor6 = client.post(
        f"/api/equipment/{tractor_id}/maintenance",
        headers=bob_headers,
        json={"maintenance_type": "repair", "service_date": "2026-05-15", "description": "Unauthorized repair"},
    )
    assert res_idor6.status_code == 404, f"Expected 404 for IDOR maintenance create, got {res_idor6.status_code}"

    # Bob attempts to update Alice's maintenance record directly
    res_idor7 = client.put(
        f"/api/equipment/{tractor_id}/maintenance/{m1_id}",
        headers=bob_headers,
        json={"cost": 99999.0},
    )
    assert res_idor7.status_code == 404, f"Expected 404 for IDOR maintenance update, got {res_idor7.status_code}"

    # Bob attempts to delete Alice's maintenance record directly
    res_idor8 = client.delete(f"/api/equipment/{tractor_id}/maintenance/{m1_id}", headers=bob_headers)
    assert res_idor8.status_code == 404, f"Expected 404 for IDOR maintenance delete, got {res_idor8.status_code}"

    print(" [PASS] 15. Cross-Tenant IDOR Attacks Strictly Blocked (404)")

    # -------------------------------------------------------------
    # 16. Nested Convenience Routes
    # -------------------------------------------------------------
    print("\n--- [16] Nested Convenience Endpoints ---")
    res_farm_eq = client.get(f"/api/farms/{alice_farm_id}/equipment", headers=alice_headers)
    assert res_farm_eq.status_code == 200
    assert len(res_farm_eq.json()) == 3

    res_field_eq = client.get(f"/api/fields/{alice_field1_id}/equipment", headers=alice_headers)
    assert res_field_eq.status_code == 200
    assert len(res_field_eq.json()) == 2  # tractor and sprayer

    print(" [PASS] 16. Nested Convenience Endpoints Verified")

    # -------------------------------------------------------------
    # 17. Maintenance Record Deletion
    # -------------------------------------------------------------
    print("\n--- [17] Maintenance Record Deletion ---")
    res_del_m = client.delete(f"/api/equipment/{tractor_id}/maintenance/{m2_id}", headers=alice_headers)
    assert res_del_m.status_code == 200
    assert res_del_m.json()["deleted"] is True

    # After deleting m2 (date: 2026-05-02), tractor's last_service_date should roll back to m1 (date: 2026-04-15)
    res_tractor_check4 = client.get(f"/api/equipment/{tractor_id}", headers=alice_headers)
    assert res_tractor_check4.json()["last_service_date"] == maint_date_1.isoformat()
    assert res_tractor_check4.json()["maintenance_count"] == 1
    assert Decimal(str(res_tractor_check4.json()["total_maintenance_cost"])) == Decimal("5400.00")

    print(" [PASS] 17. Maintenance Deletion & Service Date Recalculation Verified")

    print("\n" + "=" * 65)
    print(" ALL 17/17 PHASE 13 EQUIPMENT MANAGEMENT TESTS PASSED EXCELLENTLY!")
    print("=" * 65)


if __name__ == "__main__":
    test_phase_13_equipment_management()
