"""Automated integration and regression test suite for Phase 16: Farm Calendar Management.

Tests:
1. Database schema initialization in-memory
2. Tenant authentication (Alice & Bob)
3. Relational asset baseline (Farms, Fields, Crops, Labour workers)
4. Unauthenticated access enforcement (HTTP 401)
5. Hierarchy & boundary validation (Cross-farm field/crop/worker rejection)
6. Datetime interval validation (end_datetime < start_datetime rejected)
7. Enum validations (activity_type, status, priority, blank title)
8. Event scheduling (Standard, All-Day, and Multi-day events)
9. Date range interval overlap calculations
10. Multi-criteria filtering (farm, crop, activity type, status, priority, search)
11. Status transitions & completion timestamp tracking (planned -> in_progress -> completed -> reopened)
12. Calendar summary KPI metrics & overdue task detection
13. Multi-tenant cross-user IDOR access rejection (HTTP 404)
14. Safe event deletion without cascading damage to assets
15. Nested convenience routes (/farms/{id}/calendar/events, /crops/{id}/calendar/events)
"""

import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4
from fastapi.testclient import TestClient

# Ensure backend package can be imported
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend package can be imported
from app.database.base import Base
from app.core.dependencies import get_db
from app.main import app
from app.models.calendar import CALENDAR_ACTIVITY_TYPES

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
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


def test_calendar_suite():
    print("\n=================================================================")
    print(" Running Phase 16 Farm Calendar Management Test Suite")
    print("=================================================================")

    # 1. Setup in-memory tables
    Base.metadata.create_all(bind=engine)
    print("[PASS] Database tables initialized in memory")

    # 2. Register Tenant A (Alice)
    alice_email = f"alice_{uuid4().hex[:8]}@example.com"
    reg_a = client.post(
        "/api/auth/register",
        json={
            "email": alice_email,
            "password": "Password123!",
            "name": "Alice Farmer",
        },
    )
    assert reg_a.status_code == 201, f"Alice registration failed: {reg_a.text}"
    token_a = reg_a.json()["data"]["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    print("[PASS] Tenant A (Alice) registered and authenticated")

    # 3. Register Tenant B (Bob)
    bob_email = f"bob_{uuid4().hex[:8]}@example.com"
    reg_b = client.post(
        "/api/auth/register",
        json={
            "email": bob_email,
            "password": "Password123!",
            "name": "Bob Grower",
        },
    )
    assert reg_b.status_code == 201, f"Bob registration failed: {reg_b.text}"
    token_b = reg_b.json()["data"]["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    client.cookies.clear()
    print("[PASS] Tenant B (Bob) registered and authenticated")

    # 4. Setup Alice's Farm Assets (Farm, Field, Crop, Labour)
    farm_a_res = client.post(
        "/api/farms",
        json={
            "name": "Alice Valley Estate",
            "total_area": 120.5,
            "area_unit": "acres",
            "location": "Central Valley",
        },
        headers=headers_a,
    )
    assert farm_a_res.status_code == 201
    farm_a_id = farm_a_res.json()["id"]

    field_a_res = client.post(
        f"/api/farms/{farm_a_id}/fields",
        json={
            "name": "North Field Sector 1",
            "area": 45.0,
            "area_unit": "acres",
            "soil_type": "Loamy Clay",
        },
        headers=headers_a,
    )
    assert field_a_res.status_code == 201
    field_a_id = field_a_res.json()["id"]

    crop_a_res = client.post(
        "/api/crops",
        json={
            "field_id": field_a_id,
            "name": "Organic Durum Wheat",
            "variety": "Golden Nugget",
            "season": "Rabi",
            "sowing_date": "2026-10-01",
            "status": "growing",
            "planted_area": 45.0,
            "planted_area_unit": "acres",
        },
        headers=headers_a,
    )
    assert crop_a_res.status_code == 201
    crop_a_id = crop_a_res.json()["id"]

    labour_a_res = client.post(
        "/api/labour",
        json={
            "farm_id": farm_a_id,
            "name": "Ramesh Kumar",
            "phone": "+91-9876543210",
            "work_type": "Tractor Operator",
            "daily_wage": 750.00,
            "joining_date": "2026-01-01",
        },
        headers=headers_a,
    )
    assert labour_a_res.status_code == 201
    labour_a_id = labour_a_res.json()["id"]
    print("[PASS] Alice's farm, field, crop, and labour worker initialized")

    # 5. Setup Bob's Farm Assets
    farm_b_res = client.post(
        "/api/farms",
        json={
            "name": "Bob Highland Farm",
            "total_area": 85.0,
            "area_unit": "acres",
            "location": "Highland Valley",
        },
        headers=headers_b,
    )
    assert farm_b_res.status_code == 201
    farm_b_id = farm_b_res.json()["id"]

    field_b_res = client.post(
        f"/api/farms/{farm_b_id}/fields",
        json={
            "name": "South Terrace B",
            "area": 30.0,
            "area_unit": "acres",
        },
        headers=headers_b,
    )
    assert field_b_res.status_code == 201
    field_b_id = field_b_res.json()["id"]

    crop_b_res = client.post(
        "/api/crops",
        json={
            "field_id": field_b_id,
            "name": "Highland Barley",
            "variety": "Standard",
            "season": "Rabi",
            "sowing_date": "2026-10-05",
            "status": "growing",
            "planted_area": 30.0,
            "planted_area_unit": "acres",
        },
        headers=headers_b,
    )
    assert crop_b_res.status_code == 201
    crop_b_id = crop_b_res.json()["id"]

    labour_b_res = client.post(
        "/api/labour",
        json={
            "farm_id": farm_b_id,
            "name": "Sunil Sharma",
            "daily_wage": 600.00,
            "joining_date": "2026-02-01",
        },
        headers=headers_b,
    )
    assert labour_b_res.status_code == 201
    labour_b_id = labour_b_res.json()["id"]
    print("[PASS] Bob's farm, field, crop, and labour worker initialized")

    # 6. Security: Unauthenticated access rejected
    client.cookies.clear()
    unauth_res = client.get("/api/calendar/events")
    assert unauth_res.status_code == 401, f"Expected 401 unauth, got: {unauth_res.status_code}"
    print("[PASS] Unauthenticated access properly rejected with HTTP 401")

    # 7. Hierarchy & Validation Bounds
    # Cross-farm field attempt (Alice farm + Bob field)
    cross_field_res = client.post(
        "/api/calendar/events",
        json={
            "farm_id": farm_a_id,
            "field_id": field_b_id,
            "title": "Invalid Cross Field Task",
            "start_datetime": "2026-11-01T09:00:00Z",
        },
        headers=headers_a,
    )
    assert cross_field_res.status_code == 400

    # Cross-farm crop attempt
    cross_crop_res = client.post(
        "/api/calendar/events",
        json={
            "farm_id": farm_a_id,
            "crop_id": crop_b_id,
            "title": "Invalid Cross Crop Task",
            "start_datetime": "2026-11-01T09:00:00Z",
        },
        headers=headers_a,
    )
    assert cross_crop_res.status_code == 400

    # Cross-farm labour worker attempt
    cross_labour_res = client.post(
        "/api/calendar/events",
        json={
            "farm_id": farm_a_id,
            "assigned_labour_id": labour_b_id,
            "title": "Invalid Cross Worker Task",
            "start_datetime": "2026-11-01T09:00:00Z",
        },
        headers=headers_a,
    )
    assert cross_labour_res.status_code == 400

    # End datetime earlier than start datetime
    invalid_dates_res = client.post(
        "/api/calendar/events",
        json={
            "farm_id": farm_a_id,
            "title": "Negative Interval Event",
            "start_datetime": "2026-11-05T12:00:00Z",
            "end_datetime": "2026-11-05T10:00:00Z",
        },
        headers=headers_a,
    )
    assert invalid_dates_res.status_code in (400, 422)

    # Blank title
    blank_title_res = client.post(
        "/api/calendar/events",
        json={
            "farm_id": farm_a_id,
            "title": "   ",
            "start_datetime": "2026-11-05T12:00:00Z",
        },
        headers=headers_a,
    )
    assert blank_title_res.status_code == 422

    # Invalid activity type
    invalid_type_res = client.post(
        "/api/calendar/events",
        json={
            "farm_id": farm_a_id,
            "title": "Invalid Type Activity",
            "activity_type": "space_travel",
            "start_datetime": "2026-11-05T12:00:00Z",
        },
        headers=headers_a,
    )
    assert invalid_type_res.status_code == 422

    # Invalid status
    invalid_status_res = client.post(
        "/api/calendar/events",
        json={
            "farm_id": farm_a_id,
            "title": "Invalid Status Activity",
            "status": "sleeping",
            "start_datetime": "2026-11-05T12:00:00Z",
        },
        headers=headers_a,
    )
    assert invalid_status_res.status_code == 422
    print("[PASS] Hierarchy boundaries, inverted datetime ranges, and invalid enums rejected")

    # 8. Event Creation: Timed activity
    event_1_res = client.post(
        "/api/calendar/events",
        json={
            "farm_id": farm_a_id,
            "field_id": field_a_id,
            "crop_id": crop_a_id,
            "assigned_labour_id": labour_a_id,
            "title": "Morning Drip Irrigation Cycle",
            "description": "Run main borehole valve 2 for sector 1",
            "activity_type": "irrigation",
            "start_datetime": "2026-11-10T06:00:00Z",
            "end_datetime": "2026-11-10T09:30:00Z",
            "all_day": False,
            "status": "planned",
            "priority": "high",
            "notes": "Ensure pressure gauge stays above 2.5 bar",
        },
        headers=headers_a,
    )
    assert event_1_res.status_code == 201
    event_1 = event_1_res.json()["data"]
    event_1_id = event_1["id"]
    assert event_1["title"] == "Morning Drip Irrigation Cycle"
    assert event_1["activity_type"] == "irrigation"
    assert event_1["status"] == "planned"
    assert event_1["farm_name"] == "Alice Valley Estate"
    assert event_1["field_name"] == "North Field Sector 1"
    assert event_1["crop_name"] == "Organic Durum Wheat"
    assert event_1["assigned_labour_name"] == "Ramesh Kumar"
    print("[PASS] Valid timed activity scheduled with resolved metadata")

    # 9. Event Creation: All-day activity
    event_2_res = client.post(
        "/api/calendar/events",
        json={
            "farm_id": farm_a_id,
            "title": "Comprehensive Soil NPK Testing Day",
            "description": "Lab technicians sampling across entire estate",
            "activity_type": "crop_inspection",
            "start_datetime": "2026-11-12T00:00:00Z",
            "all_day": True,
            "status": "planned",
            "priority": "medium",
        },
        headers=headers_a,
    )
    assert event_2_res.status_code == 201
    event_2 = event_2_res.json()["data"]
    event_2_id = event_2["id"]
    assert event_2["all_day"] is True
    assert event_2["activity_type"] == "crop_inspection"
    print("[PASS] Full-day event scheduled correctly")

    # 10. Event Creation: Multi-day activity
    event_3_res = client.post(
        "/api/calendar/events",
        json={
            "farm_id": farm_a_id,
            "field_id": field_a_id,
            "crop_id": crop_a_id,
            "title": "Primary Sowing Campaign",
            "description": "Wheat seed drilling across 45 acres",
            "activity_type": "sowing",
            "start_datetime": "2026-11-15T08:00:00Z",
            "end_datetime": "2026-11-18T18:00:00Z",
            "all_day": False,
            "status": "in_progress",
            "priority": "high",
        },
        headers=headers_a,
    )
    assert event_3_res.status_code == 201
    event_3_id = event_3_res.json()["data"]["id"]
    print("[PASS] Multi-day task spanning Nov 15 to Nov 18 created")

    # 11. Event Creation: Completed event with auto timestamp
    event_4_res = client.post(
        "/api/calendar/events",
        json={
            "farm_id": farm_a_id,
            "title": "Pre-season Tractor Overhaul",
            "activity_type": "equipment_maintenance",
            "start_datetime": "2026-10-20T10:00:00Z",
            "end_datetime": "2026-10-20T15:00:00Z",
            "status": "completed",
        },
        headers=headers_a,
    )
    assert event_4_res.status_code == 201
    event_4 = event_4_res.json()["data"]
    event_4_id = event_4["id"]
    assert event_4["status"] == "completed"
    assert event_4["actual_completion_datetime"] is not None
    print("[PASS] Completed event created with automatic completion timestamp")

    # 12. Create Bob's isolated calendar event
    bob_event_res = client.post(
        "/api/calendar/events",
        json={
            "farm_id": farm_b_id,
            "crop_id": crop_b_id,
            "title": "Bob Barley Spraying Alert",
            "activity_type": "pesticide_application",
            "start_datetime": "2026-11-10T09:00:00Z",
            "status": "planned",
        },
        headers=headers_b,
    )
    assert bob_event_res.status_code == 201
    bob_event_id = bob_event_res.json()["data"]["id"]
    print("[PASS] Tenant B (Bob) calendar event created in isolation")

    # 13. Date Range Overlap Query Tests
    # Query window: Nov 16 to Nov 17 (Inside multi-day event Nov 15-18)
    overlap_res = client.get(
        "/api/calendar/events?start_date=2026-11-16T00:00:00Z&end_date=2026-11-17T23:59:59Z",
        headers=headers_a,
    )
    assert overlap_res.status_code == 200
    overlap_ids = [e["id"] for e in overlap_res.json()["data"]]
    assert event_3_id in overlap_ids, "Multi-day event Nov 15-18 must overlap query Nov 16-17"
    assert event_1_id not in overlap_ids, "Nov 10 event must not appear in Nov 16-17"
    assert event_2_id not in overlap_ids, "Nov 12 event must not appear in Nov 16-17"
    assert bob_event_id not in overlap_ids, "Bob event must never leak to Alice"

    # Query full November month
    nov_res = client.get(
        "/api/calendar/events?start_date=2026-11-01T00:00:00Z&end_date=2026-11-30T23:59:59Z",
        headers=headers_a,
    )
    assert nov_res.status_code == 200
    nov_events = nov_res.json()["data"]
    nov_ids = [e["id"] for e in nov_events]
    assert event_1_id in nov_ids
    assert event_2_id in nov_ids
    assert event_3_id in nov_ids
    assert event_4_id not in nov_ids  # October event
    print("[PASS] Date range interval overlap calculations verified (multi-day + single-day)")

    # 14. Filtering Tests
    # Filter by activity_type
    filter_type_res = client.get(
        "/api/calendar/events?activity_type=irrigation",
        headers=headers_a,
    )
    assert filter_type_res.status_code == 200
    type_data = filter_type_res.json()["data"]
    assert len(type_data) == 1
    assert type_data[0]["id"] == event_1_id

    # Filter by priority
    filter_prio_res = client.get(
        "/api/calendar/events?priority=high",
        headers=headers_a,
    )
    assert filter_prio_res.status_code == 200
    prio_ids = [e["id"] for e in filter_prio_res.json()["data"]]
    assert event_1_id in prio_ids
    assert event_3_id in prio_ids
    assert event_2_id not in prio_ids

    # Search keyword
    search_res = client.get(
        "/api/calendar/events?search=borehole",
        headers=headers_a,
    )
    assert search_res.status_code == 200
    assert len(search_res.json()["data"]) == 1
    assert search_res.json()["data"][0]["id"] == event_1_id
    print("[PASS] Multi-criteria filtering by activity type, priority, and search verified")

    # 15. Status Transitions & Completion Tracking
    # Transition event 1: planned -> in_progress
    patch_status_1 = client.patch(
        f"/api/calendar/events/{event_1_id}/status",
        json={"status": "in_progress", "notes": "Turned on pump"},
        headers=headers_a,
    )
    assert patch_status_1.status_code == 200
    assert patch_status_1.json()["data"]["status"] == "in_progress"
    assert patch_status_1.json()["data"]["actual_completion_datetime"] is None

    # Transition event 1: in_progress -> completed
    patch_status_2 = client.patch(
        f"/api/calendar/events/{event_1_id}/status",
        json={"status": "completed", "notes": "Completed 3.5 hrs run"},
        headers=headers_a,
    )
    assert patch_status_2.status_code == 200
    completed_data = patch_status_2.json()["data"]
    assert completed_data["status"] == "completed"
    assert completed_data["actual_completion_datetime"] is not None
    assert "Completed 3.5 hrs run" in completed_data["notes"]

    # Reopening event 1: completed -> in_progress
    patch_status_3 = client.patch(
        f"/api/calendar/events/{event_1_id}/status",
        json={"status": "in_progress", "notes": "Need additional 30 mins"},
        headers=headers_a,
    )
    assert patch_status_3.status_code == 200
    assert patch_status_3.json()["data"]["status"] == "in_progress"
    assert patch_status_3.json()["data"]["actual_completion_datetime"] is None
    print("[PASS] Status transitions and completion timestamp tracking verified")

    # 16. Event Update (Full update via PUT)
    put_res = client.put(
        f"/api/calendar/events/{event_2_id}",
        json={
            "title": "Comprehensive Soil NPK & Micronutrient Sampling Day",
            "priority": "high",
            "notes": "Testing for Zinc and Boron deficiency as well",
        },
        headers=headers_a,
    )
    assert put_res.status_code == 200
    assert put_res.json()["data"]["title"] == "Comprehensive Soil NPK & Micronutrient Sampling Day"
    assert put_res.json()["data"]["priority"] == "high"
    print("[PASS] Full event update via PUT verified")

    # 17. Calendar Summary Metrics
    sum_res = client.get(
        "/api/calendar/summary",
        headers=headers_a,
    )
    assert sum_res.status_code == 200
    summary = sum_res.json()["data"]
    assert summary["total_events"] == 4
    assert summary["completed_count"] == 1  # event_4
    assert summary["in_progress_count"] == 2  # event_1, event_3
    assert summary["planned_count"] == 1  # event_2
    assert summary["high_priority_count"] == 3  # event_1, event_2 (updated to high), event_3
    assert "irrigation" in summary["activity_breakdown"]
    assert "sowing" in summary["activity_breakdown"]
    print("[PASS] Calendar summary KPI metrics and activity distributions verified")

    # 18. Multi-Tenant Cross-User IDOR Security
    # Bob trying to view Alice's event
    bob_view_alice = client.get(
        f"/api/calendar/events/{event_1_id}",
        headers=headers_b,
    )
    assert bob_view_alice.status_code == 404, f"Expected 404, got: {bob_view_alice.status_code}"

    # Bob trying to update Alice's event
    bob_update_alice = client.put(
        f"/api/calendar/events/{event_1_id}",
        json={"title": "Hacked Title"},
        headers=headers_b,
    )
    assert bob_update_alice.status_code == 404

    # Bob trying to patch status of Alice's event
    bob_patch_alice = client.patch(
        f"/api/calendar/events/{event_1_id}/status",
        json={"status": "cancelled"},
        headers=headers_b,
    )
    assert bob_patch_alice.status_code == 404

    # Bob trying to delete Alice's event
    bob_delete_alice = client.delete(
        f"/api/calendar/events/{event_1_id}",
        headers=headers_b,
    )
    assert bob_delete_alice.status_code == 404

    # Bob trying to create an event under Alice's farm
    bob_create_alice_farm = client.post(
        "/api/calendar/events",
        json={
            "farm_id": farm_a_id,
            "title": "Bob Injected Task",
            "start_datetime": "2026-11-20T08:00:00Z",
        },
        headers=headers_b,
    )
    assert bob_create_alice_farm.status_code == 404
    print("[PASS] Multi-tenant cross-user IDOR access strictly blocked across all endpoints")

    # 19. Nested Convenience Endpoints
    farm_conv_res = client.get(
        f"/api/farms/{farm_a_id}/calendar/events",
        headers=headers_a,
    )
    assert farm_conv_res.status_code == 200
    assert len(farm_conv_res.json()["data"]) == 4

    crop_conv_res = client.get(
        f"/api/crops/{crop_a_id}/calendar/events",
        headers=headers_a,
    )
    assert crop_conv_res.status_code == 200
    assert len(crop_conv_res.json()["data"]) == 2
    print("[PASS] Nested convenience routes (/farms/{id}/calendar/events, /crops/{id}/calendar/events) verified")

    # 20. Safe Deletion
    del_res = client.delete(
        f"/api/calendar/events/{event_4_id}",
        headers=headers_a,
    )
    assert del_res.status_code == 200
    assert del_res.json()["data"]["success"] is True

    # Verify deleted
    get_del = client.get(
        f"/api/calendar/events/{event_4_id}",
        headers=headers_a,
    )
    assert get_del.status_code == 404

    # Verify farm asset still intact
    farm_check = client.get(
        f"/api/farms/{farm_a_id}",
        headers=headers_a,
    )
    assert farm_check.status_code == 200
    print("[PASS] Safe event deletion verified without damaging parent farm assets")

    print("=================================================================")
    print(" ALL 20 PHASE 16 CALENDAR TESTS PASSED (100%)")
    print("=================================================================")


if __name__ == "__main__":
    test_calendar_suite()
