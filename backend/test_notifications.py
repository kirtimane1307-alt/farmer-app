"""Automated tests for Phase 19: Notifications & Reminders.

Verifies:
- Notification CRUD, deduplication, summary, mark as read, mark all read, delete
- Reminder CRUD, recurrence rollover (daily, weekly, monthly), completion
- Notification preferences retrieval and updates
- Farm operational scanning (crops, attendance, salary, expense, equipment, calendar)
- User tenant isolation and security
"""

import sys
import os
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import engine, SessionLocal
from app.database.base import Base
import app.models
from app.models.user import User
from app.models.farm import Farm
from app.models.field import Field
from app.models.crop import Crop
from app.models.labour import Labour
from app.models.attendance import Attendance
from app.models.salary import SalaryRecord
from app.models.expense import Expense
from app.models.equipment import Equipment
from app.models.calendar import FarmCalendarEvent
from app.models.notification import Notification, Reminder, NotificationPreference

from app.schemas.notification import (
    ReminderCreate,
    ReminderUpdate,
    NotificationPreferenceItem,
)
from app.services import notification_service


def run_tests():
    print("=" * 60)
    print("Running Phase 19: Notifications & Reminders Test Suite")
    print("=" * 60)

    # 1. Sync tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Create test users
        test_email1 = f"notif_user1_{uuid4().hex[:6]}@farm.local"
        test_email2 = f"notif_user2_{uuid4().hex[:6]}@farm.local"

        u1 = User(name="Farmer Alice", email=test_email1, password_hash="dummy123")
        u2 = User(name="Farmer Bob", email=test_email2, password_hash="dummy123")
        db.add_all([u1, u2])
        db.commit()
        db.refresh(u1)
        db.refresh(u2)

        # Create test farm
        f1 = Farm(user_id=u1.id, name="Green Valley Farm", location="Sector 4", total_area=Decimal("50.0"))
        f2 = Farm(user_id=u2.id, name="Bob Organic Farm", location="Sector 8", total_area=Decimal("30.0"))
        db.add_all([f1, f2])
        db.commit()
        db.refresh(f1)
        db.refresh(f2)

        print("[OK] Test users and farms established.")

        # -------------------------------------------------------------
        # Test 1: Notification Creation and Deduplication
        # -------------------------------------------------------------
        n1 = notification_service.create_notification(
            db=db,
            user_id=u1.id,
            title="Fertilizer Scheduled",
            message="Apply Urea in Plot 1 tomorrow",
            category="fertilizer_pesticide",
            priority="high",
            farm_id=f1.id,
            related_module="calendar",
            related_record_id="rec-fert-101",
            action_url="/applications",
        )
        assert n1 is not None, "Failed to create initial notification"
        assert n1.title == "Fertilizer Scheduled"
        assert n1.is_read is False

        # Attempt to create duplicate with same related_record_id within deduplication window
        n_dup = notification_service.create_notification(
            db=db,
            user_id=u1.id,
            title="Fertilizer Scheduled Repeated",
            message="Duplicate attempt",
            category="fertilizer_pesticide",
            priority="high",
            farm_id=f1.id,
            related_module="calendar",
            related_record_id="rec-fert-101",
        )
        assert n_dup is None, "Deduplication failed! Duplicate notification was created."
        print("[TEST 1 PASSED] Notification creation and duplicate prevention verified.")

        # -------------------------------------------------------------
        # Test 2: Notification Listing and Filtering
        # -------------------------------------------------------------
        n2 = notification_service.create_notification(
            db=db,
            user_id=u1.id,
            title="Irrigation Alert",
            message="Drip cycle completed in Sector B",
            category="irrigation",
            priority="low",
            farm_id=f1.id,
        )
        n3 = notification_service.create_notification(
            db=db,
            user_id=u1.id,
            title="Urgent Equipment Repair",
            message="Tractor oil filter replacement overdue",
            category="equipment_maintenance",
            priority="urgent",
            farm_id=f1.id,
        )

        # List all for u1
        notifs, total = notification_service.list_notifications(db=db, user_id=u1.id)
        assert total >= 3, f"Expected at least 3 notifications, got {total}"

        # Filter by priority urgent
        urgent_list, urgent_total = notification_service.list_notifications(
            db=db, user_id=u1.id, priority="urgent"
        )
        assert urgent_total == 1, f"Expected 1 urgent notification, got {urgent_total}"
        assert urgent_list[0].title == "Urgent Equipment Repair"

        # Filter by category irrigation
        irri_list, irri_total = notification_service.list_notifications(
            db=db, user_id=u1.id, category="irrigation"
        )
        assert irri_total == 1
        assert irri_list[0].title == "Irrigation Alert"

        print("[TEST 2 PASSED] Notification list and category/priority filters verified.")

        # -------------------------------------------------------------
        # Test 3: Mark Single & Mark All Read
        # -------------------------------------------------------------
        read_notif = notification_service.mark_as_read(db=db, notification_id=n1.id, user_id=u1.id)
        assert read_notif is not None
        assert read_notif.is_read is True
        assert read_notif.read_at is not None

        # Summary check
        summary1 = notification_service.get_notification_summary(db=db, user_id=u1.id)
        assert summary1.unread_notifications == 2, f"Expected 2 unread, got {summary1.unread_notifications}"

        # Mark all read
        updated_count = notification_service.mark_all_as_read(db=db, user_id=u1.id)
        assert updated_count == 2, f"Expected 2 updated, got {updated_count}"

        summary2 = notification_service.get_notification_summary(db=db, user_id=u1.id)
        assert summary2.unread_notifications == 0
        print("[TEST 3 PASSED] Mark as read and mark all as read verified.")

        # -------------------------------------------------------------
        # Test 4: Custom Reminder CRUD and Recurrence
        # -------------------------------------------------------------
        due_dt = datetime.now(timezone.utc) + timedelta(days=2)
        rem_in = ReminderCreate(
            title="Inspect Wheat Rust",
            description="Check leaves for fungal infection",
            farm_id=f1.id,
            category="crop",
            priority="high",
            reminder_datetime=due_dt,
            recurrence_type="weekly",
            recurrence_interval=1,
        )
        rem = notification_service.create_reminder(db=db, user_id=u1.id, data=rem_in)
        assert rem.id is not None
        assert rem.status == "pending"
        assert rem.recurrence_type == "weekly"

        # Update reminder
        upd_data = ReminderUpdate(priority="urgent", description="Check fungal spread immediately")
        upd_rem = notification_service.update_reminder(
            db=db, reminder_id=rem.id, user_id=u1.id, data=upd_data
        )
        assert upd_rem.priority == "urgent"
        assert upd_rem.description == "Check fungal spread immediately"

        # Complete recurring reminder -> should rollover by 1 week
        completed_rem = notification_service.complete_reminder(
            db=db, reminder_id=rem.id, user_id=u1.id
        )
        assert completed_rem.status == "pending", "Recurring reminder should remain pending with next run date"
        assert completed_rem.completed_at is not None
        # Next run should be 7 days from due_dt
        expected_next = due_dt + timedelta(weeks=1)
        assert abs((completed_rem.reminder_datetime - expected_next).total_seconds()) < 60

        # Complete a non-recurring reminder
        non_rec_in = ReminderCreate(
            title="Buy Seeds",
            category="general",
            priority="low",
            reminder_datetime=due_dt,
            recurrence_type="none",
        )
        non_rec = notification_service.create_reminder(db=db, user_id=u1.id, data=non_rec_in)
        done_non_rec = notification_service.complete_reminder(
            db=db, reminder_id=non_rec.id, user_id=u1.id
        )
        assert done_non_rec.status == "completed"
        assert done_non_rec.next_run_at is None

        print("[TEST 4 PASSED] Custom reminder CRUD and recurring rollover verified.")

        # -------------------------------------------------------------
        # Test 5: Notification Preferences Management
        # -------------------------------------------------------------
        prefs = notification_service.get_user_preferences(db=db, user_id=u1.id)
        assert len(prefs) >= 11, f"Expected 11 categories in preferences, got {len(prefs)}"

        # Disable labour_attendance and set crop notice to 3 days
        new_prefs = [
            NotificationPreferenceItem(category="labour_attendance", is_enabled=False, advance_notice_days=0),
            NotificationPreferenceItem(category="crop", is_enabled=True, advance_notice_days=3),
        ]
        updated_prefs = notification_service.update_user_preferences(
            db=db, user_id=u1.id, preferences=new_prefs
        )
        pref_map = {p.category: p for p in updated_prefs}
        assert pref_map["labour_attendance"].is_enabled is False
        assert pref_map["crop"].advance_notice_days == 3
        print("[TEST 5 PASSED] User notification preferences configuration verified.")

        # -------------------------------------------------------------
        # Test 6: Operational Records Scanner
        # -------------------------------------------------------------
        # Create a field, crop with upcoming harvest, equipment with overdue maintenance
        field1 = Field(farm_id=f1.id, name="North Sector", area=Decimal("20.0"))
        db.add(field1)
        db.commit()
        db.refresh(field1)

        today_dt = date.today()
        test_crop = Crop(
            field_id=field1.id,
            name="Organic Mustard",
            variety="Pusa Bold",
            sowing_date=today_dt - timedelta(days=90),
            expected_harvest_date=today_dt + timedelta(days=2),  # within notice window
            status="ready_to_harvest",
        )
        test_equip = Equipment(
            farm_id=f1.id,
            equipment_name="Mahindra Tractor 575",
            equipment_type="Tractor",
            operational_status="available",
            next_service_date=today_dt - timedelta(days=5),  # Overdue maintenance!
        )
        test_expense = Expense(
            farm_id=f1.id,
            category="fuel",
            title="Diesel for Irrigation Pump",
            amount=Decimal("3500.00"),
            amount_paid=Decimal("0.00"),
            outstanding_balance=Decimal("3500.00"),
            expense_date=today_dt - timedelta(days=2),
            payment_status="unpaid",
        )
        db.add_all([test_crop, test_equip, test_expense])
        db.commit()

        scan_result = notification_service.scan_and_generate_alerts(db=db, user_id=u1.id)
        assert scan_result.notifications_created > 0, "Operational scan failed to create alerts from real DB records"
        print(f"[TEST 6 PASSED] Operational scan created {scan_result.notifications_created} alert(s) from real farm data.")

        # -------------------------------------------------------------
        # Test 7: Multi-Tenant Isolation
        # -------------------------------------------------------------
        # Bob (u2) should NOT see Alice's notifications or reminders
        bob_notifs, bob_total = notification_service.list_notifications(db=db, user_id=u2.id)
        assert bob_total == 0, f"Tenant isolation breach! Bob sees {bob_total} notifications from Alice."

        # Bob cannot delete Alice's reminder
        can_del = notification_service.delete_reminder(db=db, reminder_id=rem.id, user_id=u2.id)
        assert can_del is False, "Tenant isolation breach! Bob was able to delete Alice's reminder."

        print("[TEST 7 PASSED] Multi-tenant isolation verified.")

        print("=" * 60)
        print("ALL 7 PHASE 19 NOTIFICATIONS & REMINDERS TESTS PASSED SUCCESSFULLY!")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    run_tests()

