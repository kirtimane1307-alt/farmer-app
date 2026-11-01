"""Notification and Reminder domain service for Phase 19.

Handles notification queries, reminder lifecycle with recurrence,
preference management, deduplication, and automated farm operational scanning.
"""

import logging
from datetime import datetime, date, time, timedelta, timezone
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID

from sqlalchemy import desc, func, or_, and_
from sqlalchemy.orm import Session

from app.models.notification import (
    Notification,
    Reminder,
    NotificationPreference,
    NOTIFICATION_CATEGORIES,
)
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
from app.schemas.notification import (
    NotificationResponse,
    NotificationSummary,
    ReminderCreate,
    ReminderUpdate,
    ReminderResponse,
    NotificationPreferenceItem,
    ScanResultsResponse,
)

logger = logging.getLogger("farm-management.notifications")


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _get_utc_now() -> datetime:
    """Return timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)


def _get_today() -> date:
    """Return current date."""
    return datetime.now(timezone.utc).date()


def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure datetime has timezone UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _format_notification_response(notif: Notification) -> NotificationResponse:
    """Format SQLAlchemy Notification model to Pydantic response."""
    return NotificationResponse(
        id=notif.id,
        user_id=notif.user_id,
        farm_id=notif.farm_id,
        title=notif.title,
        message=notif.message,
        category=notif.category,
        priority=notif.priority,
        related_module=notif.related_module,
        related_record_id=notif.related_record_id,
        action_url=notif.action_url,
        is_read=notif.is_read,
        read_at=_ensure_utc(notif.read_at),
        created_at=_ensure_utc(notif.created_at) or _get_utc_now(),
        updated_at=_ensure_utc(notif.updated_at) or _get_utc_now(),
        farm_name=notif.farm.name if notif.farm else None,
    )


def _format_reminder_response(rem: Reminder) -> ReminderResponse:
    """Format SQLAlchemy Reminder model to Pydantic response."""
    return ReminderResponse(
        id=rem.id,
        user_id=rem.user_id,
        farm_id=rem.farm_id,
        field_id=rem.field_id,
        crop_id=rem.crop_id,
        title=rem.title,
        description=rem.description,
        category=rem.category,
        priority=rem.priority,
        reminder_datetime=_ensure_utc(rem.reminder_datetime) or _get_utc_now(),
        recurrence_type=rem.recurrence_type,
        recurrence_interval=rem.recurrence_interval,
        status=rem.status,
        completed_at=_ensure_utc(rem.completed_at),
        next_run_at=_ensure_utc(rem.next_run_at),
        created_at=_ensure_utc(rem.created_at) or _get_utc_now(),
        updated_at=_ensure_utc(rem.updated_at) or _get_utc_now(),
        farm_name=rem.farm.name if rem.farm else None,
        field_name=rem.field.name if rem.field else None,
        crop_name=rem.crop.name if rem.crop else None,
    )


# ---------------------------------------------------------------------------
# Notifications CRUD & Actions
# ---------------------------------------------------------------------------

def list_notifications(
    db: Session,
    user_id: UUID,
    farm_id: Optional[UUID] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    is_read: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[NotificationResponse], int]:
    """Retrieve paginated notifications for the specified user with optional filtering."""
    query = db.query(Notification).filter(Notification.user_id == user_id)

    if farm_id is not None:
        query = query.filter(Notification.farm_id == farm_id)

    if category:
        query = query.filter(Notification.category == category.lower().strip())

    if priority:
        query = query.filter(Notification.priority == priority.lower().strip())

    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Notification.title.ilike(search_pattern),
                Notification.message.ilike(search_pattern),
            )
        )

    total_count = query.count()
    records = (
        query.order_by(desc(Notification.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [_format_notification_response(n) for n in records], total_count


def get_notification_summary(
    db: Session,
    user_id: UUID,
    farm_id: Optional[UUID] = None,
) -> NotificationSummary:
    """Compute aggregate telemetry for notifications and reminders."""
    notif_query = db.query(Notification).filter(Notification.user_id == user_id)
    reminder_query = db.query(Reminder).filter(Reminder.user_id == user_id)

    if farm_id is not None:
        notif_query = notif_query.filter(Notification.farm_id == farm_id)
        reminder_query = reminder_query.filter(Reminder.farm_id == farm_id)

    total_notifications = notif_query.count()
    unread_notifications = notif_query.filter(Notification.is_read == False).count()
    urgent_notifications = notif_query.filter(
        Notification.is_read == False,
        Notification.priority.in_(["high", "urgent"]),
    ).count()

    active_reminders = reminder_query.filter(
        Reminder.status.in_(["pending", "overdue"])
    ).count()

    # Overdue reminder count (either status is overdue or reminder_datetime < now and pending)
    now = _get_utc_now()
    overdue_reminders = reminder_query.filter(
        or_(
            Reminder.status == "overdue",
            and_(Reminder.status == "pending", Reminder.reminder_datetime < now),
        )
    ).count()

    return NotificationSummary(
        total_notifications=total_notifications,
        unread_notifications=unread_notifications,
        urgent_notifications=urgent_notifications,
        active_reminders=active_reminders,
        overdue_reminders=overdue_reminders,
    )


def mark_as_read(
    db: Session,
    notification_id: UUID,
    user_id: UUID,
) -> Optional[NotificationResponse]:
    """Mark a single notification as read."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if not notif:
        return None

    if not notif.is_read:
        notif.is_read = True
        notif.read_at = _get_utc_now()
        db.commit()
        db.refresh(notif)

    return _format_notification_response(notif)


def mark_all_as_read(
    db: Session,
    user_id: UUID,
    farm_id: Optional[UUID] = None,
    category: Optional[str] = None,
) -> int:
    """Mark all unread notifications for a user as read."""
    query = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False,
    )
    if farm_id is not None:
        query = query.filter(Notification.farm_id == farm_id)
    if category:
        query = query.filter(Notification.category == category.lower().strip())

    now = _get_utc_now()
    updated = query.update(
        {Notification.is_read: True, Notification.read_at: now},
        synchronize_session="fetch",
    )
    db.commit()
    return updated


def delete_notification(
    db: Session,
    notification_id: UUID,
    user_id: UUID,
) -> bool:
    """Delete a notification owned by the user."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if not notif:
        return False

    db.delete(notif)
    db.commit()
    return True


def create_notification(
    db: Session,
    user_id: UUID,
    title: str,
    message: str,
    category: str,
    priority: str = "medium",
    farm_id: Optional[UUID] = None,
    related_module: Optional[str] = None,
    related_record_id: Optional[str] = None,
    action_url: Optional[str] = None,
    deduplicate_hours: int = 24,
) -> Optional[Notification]:
    """
    Create a notification with duplicate prevention.
    If a notification for the same related_record_id exists within deduplicate_hours, skips creation.
    """
    if related_module and related_record_id:
        cutoff = _get_utc_now() - timedelta(hours=deduplicate_hours)
        existing = (
            db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.related_module == related_module,
                Notification.related_record_id == str(related_record_id),
                or_(
                    Notification.is_read == False,
                    Notification.created_at >= cutoff,
                ),
            )
            .first()
        )
        if existing:
            # Already alerted; avoid spam
            return None

    notif = Notification(
        user_id=user_id,
        farm_id=farm_id,
        title=title.strip(),
        message=message.strip(),
        category=category.lower().strip(),
        priority=priority.lower().strip(),
        related_module=related_module,
        related_record_id=str(related_record_id) if related_record_id else None,
        action_url=action_url,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


# ---------------------------------------------------------------------------
# Reminders CRUD & Lifecycle
# ---------------------------------------------------------------------------

def list_reminders(
    db: Session,
    user_id: UUID,
    farm_id: Optional[UUID] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> Tuple[List[ReminderResponse], int]:
    """List custom reminders for a user with filters."""
    query = db.query(Reminder).filter(Reminder.user_id == user_id)

    if farm_id is not None:
        query = query.filter(Reminder.farm_id == farm_id)

    if status:
        query = query.filter(Reminder.status == status.lower().strip())

    if category:
        query = query.filter(Reminder.category == category.lower().strip())

    if priority:
        query = query.filter(Reminder.priority == priority.lower().strip())

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Reminder.title.ilike(search_pattern),
                Reminder.description.ilike(search_pattern),
            )
        )

    total_count = query.count()
    records = (
        query.order_by(Reminder.reminder_datetime.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [_format_reminder_response(r) for r in records], total_count


def get_reminder(
    db: Session,
    reminder_id: UUID,
    user_id: UUID,
) -> Optional[ReminderResponse]:
    """Retrieve a single reminder by ID with user ownership check."""
    rem = (
        db.query(Reminder)
        .filter(Reminder.id == reminder_id, Reminder.user_id == user_id)
        .first()
    )
    return _format_reminder_response(rem) if rem else None


def create_reminder(
    db: Session,
    user_id: UUID,
    data: ReminderCreate,
) -> ReminderResponse:
    """Create a new farm reminder."""
    # Ensure reminder_datetime is timezone-aware
    reminder_dt = data.reminder_datetime
    if reminder_dt.tzinfo is None:
        reminder_dt = reminder_dt.replace(tzinfo=timezone.utc)

    rem = Reminder(
        user_id=user_id,
        farm_id=data.farm_id,
        field_id=data.field_id,
        crop_id=data.crop_id,
        title=data.title.strip(),
        description=data.description.strip() if data.description else None,
        category=data.category.lower().strip(),
        priority=data.priority.lower().strip(),
        reminder_datetime=reminder_dt,
        recurrence_type=data.recurrence_type.lower().strip(),
        recurrence_interval=data.recurrence_interval,
        status="pending",
        next_run_at=reminder_dt,
    )
    db.add(rem)
    db.commit()
    db.refresh(rem)
    return _format_reminder_response(rem)


def update_reminder(
    db: Session,
    reminder_id: UUID,
    user_id: UUID,
    data: ReminderUpdate,
) -> Optional[ReminderResponse]:
    """Update an existing reminder."""
    rem = (
        db.query(Reminder)
        .filter(Reminder.id == reminder_id, Reminder.user_id == user_id)
        .first()
    )
    if not rem:
        return None

    if data.title is not None:
        rem.title = data.title.strip()
    if data.description is not None:
        rem.description = data.description.strip() if data.description else None
    if data.farm_id is not None:
        rem.farm_id = data.farm_id
    if data.field_id is not None:
        rem.field_id = data.field_id
    if data.crop_id is not None:
        rem.crop_id = data.crop_id
    if data.category is not None:
        rem.category = data.category.lower().strip()
    if data.priority is not None:
        rem.priority = data.priority.lower().strip()
    if data.reminder_datetime is not None:
        reminder_dt = data.reminder_datetime
        if reminder_dt.tzinfo is None:
            reminder_dt = reminder_dt.replace(tzinfo=timezone.utc)
        rem.reminder_datetime = reminder_dt
        rem.next_run_at = reminder_dt
    if data.recurrence_type is not None:
        rem.recurrence_type = data.recurrence_type.lower().strip()
    if data.recurrence_interval is not None:
        rem.recurrence_interval = data.recurrence_interval
    if data.status is not None:
        rem.status = data.status.lower().strip()
        if rem.status == "completed" and not rem.completed_at:
            rem.completed_at = _get_utc_now()

    db.commit()
    db.refresh(rem)
    return _format_reminder_response(rem)


def complete_reminder(
    db: Session,
    reminder_id: UUID,
    user_id: UUID,
) -> Optional[ReminderResponse]:
    """
    Mark a reminder as completed.
    If it has recurrence (daily/weekly/monthly), calculate next occurrence and keep pending.
    """
    rem = (
        db.query(Reminder)
        .filter(Reminder.id == reminder_id, Reminder.user_id == user_id)
        .first()
    )
    if not rem:
        return None

    now = _get_utc_now()
    rem.completed_at = now

    if rem.recurrence_type == "none":
        rem.status = "completed"
        rem.next_run_at = None
    else:
        # Calculate next scheduled run
        interval = max(1, rem.recurrence_interval)
        current_dt = rem.reminder_datetime
        if current_dt.tzinfo is None:
            current_dt = current_dt.replace(tzinfo=timezone.utc)
        if rem.recurrence_type == "daily":
            next_dt = current_dt + timedelta(days=interval)
        elif rem.recurrence_type == "weekly":
            next_dt = current_dt + timedelta(weeks=interval)
        elif rem.recurrence_type == "monthly":
            next_dt = current_dt + timedelta(days=30 * interval)
        else:
            next_dt = current_dt + timedelta(days=interval)

        rem.reminder_datetime = next_dt
        rem.next_run_at = next_dt
        rem.status = "pending"

        # Notify user that recurrence is scheduled
        create_notification(
            db=db,
            user_id=user_id,
            title=f"Reminder Completed & Rescheduled: {rem.title}",
            message=f"Reminder '{rem.title}' marked completed for previous cycle. Next run scheduled for {next_dt.strftime('%b %d, %Y %H:%M')}.",
            category="custom_reminder",
            priority="low",
            farm_id=rem.farm_id,
            action_url="/notifications",
        )

    db.commit()
    db.refresh(rem)
    return _format_reminder_response(rem)


def delete_reminder(
    db: Session,
    reminder_id: UUID,
    user_id: UUID,
) -> bool:
    """Delete a reminder owned by the user."""
    rem = (
        db.query(Reminder)
        .filter(Reminder.id == reminder_id, Reminder.user_id == user_id)
        .first()
    )
    if not rem:
        return False

    db.delete(rem)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# Notification Preferences
# ---------------------------------------------------------------------------

def get_user_preferences(
    db: Session,
    user_id: UUID,
) -> List[NotificationPreferenceItem]:
    """Retrieve all notification preferences for a user, filling in defaults if absent."""
    stored_prefs = {
        p.category: p
        for p in db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).all()
    }

    results: List[NotificationPreferenceItem] = []
    for cat in NOTIFICATION_CATEGORIES:
        if cat in stored_prefs:
            p = stored_prefs[cat]
            results.append(
                NotificationPreferenceItem(
                    category=p.category,
                    is_enabled=p.is_enabled,
                    advance_notice_days=p.advance_notice_days,
                )
            )
        else:
            # Default enabled with 1 or 2 days notice
            default_notice = 2 if cat in ["crop", "salary_payment", "equipment_maintenance"] else 1
            results.append(
                NotificationPreferenceItem(
                    category=cat,
                    is_enabled=True,
                    advance_notice_days=default_notice,
                )
            )

    return results


def update_user_preferences(
    db: Session,
    user_id: UUID,
    preferences: List[NotificationPreferenceItem],
) -> List[NotificationPreferenceItem]:
    """Upsert notification preferences for user."""
    for item in preferences:
        cat = item.category.lower().strip()
        pref = (
            db.query(NotificationPreference)
            .filter(
                NotificationPreference.user_id == user_id,
                NotificationPreference.category == cat,
            )
            .first()
        )
        if pref:
            pref.is_enabled = item.is_enabled
            pref.advance_notice_days = item.advance_notice_days
        else:
            pref = NotificationPreference(
                user_id=user_id,
                category=cat,
                is_enabled=item.is_enabled,
                advance_notice_days=item.advance_notice_days,
            )
            db.add(pref)

    db.commit()
    return get_user_preferences(db, user_id)


# ---------------------------------------------------------------------------
# Automated Reminder Engine / Farm Operational Scanner
# ---------------------------------------------------------------------------

def scan_and_generate_alerts(
    db: Session,
    user_id: Optional[UUID] = None,
) -> ScanResultsResponse:
    """
    Automated scanner that scans existing operational farm records:
    crops, irrigation, fertilizer/pesticides, labour attendance, salaries,
    harvests, expenses, machinery maintenance, calendar events, and custom reminders.
    Creates timely, non-duplicating notifications.
    """
    now = _get_utc_now()
    today = _get_today()
    created_count = 0
    evaluated_count = 0
    details: List[str] = []

    # Identify target users
    if user_id:
        users = db.query(User).filter(User.id == user_id).all()
    else:
        users = db.query(User).all()

    for user in users:
        # Load user's preference map
        pref_list = get_user_preferences(db, user.id)
        prefs: Dict[str, NotificationPreferenceItem] = {p.category: p for p in pref_list}

        # User's farms
        farms = db.query(Farm).filter(Farm.user_id == user.id).all()
        farm_ids = [f.id for f in farms]
        farm_names = {f.id: f.name for f in farms}

        if not farm_ids:
            continue

        # -------------------------------------------------------------------
        # 1. Crop Notifications (Sowing & Harvesting)
        # -------------------------------------------------------------------
        if prefs.get("crop", NotificationPreferenceItem(category="crop")).is_enabled:
            crop_notice_days = prefs["crop"].advance_notice_days
            crop_cutoff = today + timedelta(days=crop_notice_days)

            # Query crops in user's farms
            crops = (
                db.query(Crop)
                .join(Field, Crop.field_id == Field.id)
                .filter(Field.farm_id.in_(farm_ids))
                .all()
            )

            for crop in crops:
                farm_id = crop.field.farm_id if crop.field else None
                farm_name = farm_names.get(farm_id, "Farm")
                field_name = crop.field.name if crop.field else "Field"

                # Sowing reminder (for planned crops)
                if crop.status == "planned" and crop.sowing_date:
                    evaluated_count += 1
                    if crop.sowing_date <= crop_cutoff and crop.sowing_date >= today:
                        days_diff = (crop.sowing_date - today).days
                        time_str = "today" if days_diff == 0 else f"in {days_diff} day(s)"
                        notif = create_notification(
                            db=db,
                            user_id=user.id,
                            title=f"Upcoming Crop Sowing: {crop.name}",
                            message=f"Sowing for '{crop.name}' ({crop.variety}) on field '{field_name}' ({farm_name}) is scheduled {time_str} ({crop.sowing_date}).",
                            category="crop",
                            priority="medium" if days_diff > 0 else "high",
                            farm_id=farm_id,
                            related_module="crop",
                            related_record_id=f"crop-sow-{crop.id}-{crop.sowing_date}",
                            action_url="/crops",
                        )
                        if notif:
                            created_count += 1
                            details.append(f"Crop sowing notice generated for {crop.name}")

                # Expected harvest reminders (growing or ready_to_harvest)
                if crop.status in ["growing", "ready_to_harvest"] and crop.expected_harvest_date:
                    evaluated_count += 1
                    if crop.expected_harvest_date < today:
                        # Overdue harvest
                        notif = create_notification(
                            db=db,
                            user_id=user.id,
                            title=f"Harvest Window Overdue: {crop.name}",
                            message=f"Crop '{crop.name}' on field '{field_name}' was scheduled for harvest on {crop.expected_harvest_date}. Please update harvest operations.",
                            category="harvest" if prefs.get("harvest", NotificationPreferenceItem(category="harvest")).is_enabled else "crop",
                            priority="urgent",
                            farm_id=farm_id,
                            related_module="crop",
                            related_record_id=f"crop-harvest-overdue-{crop.id}-{crop.expected_harvest_date}",
                            action_url="/crops",
                        )
                        if notif:
                            created_count += 1
                            details.append(f"Overdue harvest notice generated for {crop.name}")
                    elif crop.expected_harvest_date <= crop_cutoff:
                        days_diff = (crop.expected_harvest_date - today).days
                        notif = create_notification(
                            db=db,
                            user_id=user.id,
                            title=f"Harvest Window Approaching: {crop.name}",
                            message=f"Crop '{crop.name}' on field '{field_name}' is expected to reach harvest maturity in {days_diff} day(s) ({crop.expected_harvest_date}).",
                            category="harvest" if prefs.get("harvest", NotificationPreferenceItem(category="harvest")).is_enabled else "crop",
                            priority="high",
                            farm_id=farm_id,
                            related_module="crop",
                            related_record_id=f"crop-harvest-due-{crop.id}-{crop.expected_harvest_date}",
                            action_url="/crops",
                        )
                        if notif:
                            created_count += 1
                            details.append(f"Approaching harvest notice generated for {crop.name}")

        # -------------------------------------------------------------------
        # 2. Irrigation Reminders (Calendar & Tasks)
        # -------------------------------------------------------------------
        if prefs.get("irrigation", NotificationPreferenceItem(category="irrigation")).is_enabled:
            irri_notice_days = prefs["irrigation"].advance_notice_days
            irri_window_end = now + timedelta(days=irri_notice_days)

            calendar_events = (
                db.query(FarmCalendarEvent)
                .filter(
                    FarmCalendarEvent.farm_id.in_(farm_ids),
                    FarmCalendarEvent.activity_type == "irrigation",
                    FarmCalendarEvent.status == "planned",
                )
                .all()
            )

            for ev in calendar_events:
                evaluated_count += 1
                ev_start = ev.start_datetime
                if ev_start.tzinfo is None:
                    ev_start = ev_start.replace(tzinfo=timezone.utc)

                if ev_start < now:
                    # Missed irrigation
                    notif = create_notification(
                        db=db,
                        user_id=user.id,
                        title=f"Missed Irrigation: {ev.title}",
                        message=f"Scheduled irrigation task '{ev.title}' on farm '{farm_names.get(ev.farm_id, 'Farm')}' was due on {ev_start.strftime('%b %d, %H:%M')} and remains pending.",
                        category="irrigation",
                        priority="high",
                        farm_id=ev.farm_id,
                        related_module="calendar",
                        related_record_id=f"irri-missed-{ev.id}",
                        action_url="/calendar",
                    )
                    if notif:
                        created_count += 1
                        details.append(f"Missed irrigation notice: {ev.title}")
                elif ev_start <= irri_window_end:
                    # Upcoming irrigation
                    notif = create_notification(
                        db=db,
                        user_id=user.id,
                        title=f"Upcoming Irrigation: {ev.title}",
                        message=f"Irrigation activity '{ev.title}' is scheduled for {ev_start.strftime('%b %d, %H:%M')}.",
                        category="irrigation",
                        priority="medium",
                        farm_id=ev.farm_id,
                        related_module="calendar",
                        related_record_id=f"irri-upcoming-{ev.id}",
                        action_url="/calendar",
                    )
                    if notif:
                        created_count += 1
                        details.append(f"Upcoming irrigation notice: {ev.title}")

        # -------------------------------------------------------------------
        # 3. Fertilizer & Pesticide Applications
        # -------------------------------------------------------------------
        if prefs.get("fertilizer_pesticide", NotificationPreferenceItem(category="fertilizer_pesticide")).is_enabled:
            fert_notice_days = prefs["fertilizer_pesticide"].advance_notice_days
            fert_window_end = now + timedelta(days=fert_notice_days)

            fert_events = (
                db.query(FarmCalendarEvent)
                .filter(
                    FarmCalendarEvent.farm_id.in_(farm_ids),
                    FarmCalendarEvent.activity_type.in_(["fertilizer_application", "pesticide_application"]),
                    FarmCalendarEvent.status == "planned",
                )
                .all()
            )

            for ev in fert_events:
                evaluated_count += 1
                ev_start = ev.start_datetime
                if ev_start.tzinfo is None:
                    ev_start = ev_start.replace(tzinfo=timezone.utc)

                activity_label = "Fertilizer" if ev.activity_type == "fertilizer_application" else "Pesticide"

                if ev_start < now:
                    notif = create_notification(
                        db=db,
                        user_id=user.id,
                        title=f"Missed {activity_label} Application: {ev.title}",
                        message=f"Scheduled {activity_label.lower()} application '{ev.title}' was due on {ev_start.strftime('%b %d, %H:%M')}.",
                        category="fertilizer_pesticide",
                        priority="high",
                        farm_id=ev.farm_id,
                        related_module="calendar",
                        related_record_id=f"fert-missed-{ev.id}",
                        action_url="/applications",
                    )
                    if notif:
                        created_count += 1
                        details.append(f"Missed application notice: {ev.title}")
                elif ev_start <= fert_window_end:
                    notif = create_notification(
                        db=db,
                        user_id=user.id,
                        title=f"Upcoming {activity_label} Application: {ev.title}",
                        message=f"Application task '{ev.title}' is scheduled for {ev_start.strftime('%b %d, %H:%M')}.",
                        category="fertilizer_pesticide",
                        priority="medium",
                        farm_id=ev.farm_id,
                        related_module="calendar",
                        related_record_id=f"fert-due-{ev.id}",
                        action_url="/applications",
                    )
                    if notif:
                        created_count += 1
                        details.append(f"Upcoming application notice: {ev.title}")

        # -------------------------------------------------------------------
        # 4. Labour & Missing Attendance Notifications
        # -------------------------------------------------------------------
        if prefs.get("labour_attendance", NotificationPreferenceItem(category="labour_attendance")).is_enabled:
            for farm in farms:
                evaluated_count += 1
                active_labourers = (
                    db.query(Labour)
                    .filter(Labour.farm_id == farm.id, Labour.status == "active")
                    .count()
                )

                if active_labourers > 0:
                    # Check if any attendance records have been registered for today
                    today_attendance_count = (
                        db.query(Attendance)
                        .join(Labour, Attendance.labour_id == Labour.id)
                        .filter(Labour.farm_id == farm.id, Attendance.attendance_date == today)
                        .count()
                    )

                    if today_attendance_count == 0:
                        # Missing daily attendance record
                        notif = create_notification(
                            db=db,
                            user_id=user.id,
                            title=f"Missing Daily Attendance: {farm.name}",
                            message=f"Attendance has not yet been recorded for {active_labourers} active worker(s) on farm '{farm.name}' today ({today.strftime('%b %d')}).",
                            category="labour_attendance",
                            priority="medium",
                            farm_id=farm.id,
                            related_module="attendance",
                            related_record_id=f"attendance-missing-{farm.id}-{today}",
                            action_url="/attendance",
                            deduplicate_hours=24,
                        )
                        if notif:
                            created_count += 1
                            details.append(f"Missing attendance alert for {farm.name}")

        # -------------------------------------------------------------------
        # 5. Salary & Payment Reminders
        # -------------------------------------------------------------------
        if prefs.get("salary_payment", NotificationPreferenceItem(category="salary_payment")).is_enabled:
            unpaid_salaries = (
                db.query(SalaryRecord)
                .filter(
                    SalaryRecord.farm_id.in_(farm_ids),
                    SalaryRecord.status.in_(["draft", "generated", "partially_paid"]),
                    SalaryRecord.outstanding_balance > Decimal("0.00"),
                )
                .all()
            )

            for sal in unpaid_salaries:
                evaluated_count += 1
                labour_name = sal.labour.name if sal.labour else "Labour"
                period_str = f"{sal.period_start} to {sal.period_end}"
                is_overdue = sal.period_end < today

                notif = create_notification(
                    db=db,
                    user_id=user.id,
                    title=f"Pending Salary: {labour_name}",
                    message=f"Outstanding wage balance of ₹{sal.outstanding_balance:,.2f} is pending for {labour_name} (Period: {period_str}).",
                    category="salary_payment",
                    priority="high" if is_overdue else "medium",
                    farm_id=sal.farm_id,
                    related_module="salary",
                    related_record_id=f"salary-pending-{sal.id}",
                    action_url="/salaries",
                )
                if notif:
                    created_count += 1
                    details.append(f"Salary payment reminder for {labour_name}")

        # -------------------------------------------------------------------
        # 6. Expense & Financial Reminders
        # -------------------------------------------------------------------
        if prefs.get("expense_finance", NotificationPreferenceItem(category="expense_finance")).is_enabled:
            pending_expenses = (
                db.query(Expense)
                .filter(
                    Expense.farm_id.in_(farm_ids),
                    Expense.payment_status.in_(["unpaid", "partially_paid"]),
                    Expense.outstanding_balance > Decimal("0.00"),
                )
                .all()
            )

            for exp in pending_expenses:
                evaluated_count += 1
                notif = create_notification(
                    db=db,
                    user_id=user.id,
                    title=f"Pending Expense Payment: {exp.title}",
                    message=f"Pending operational liability of ₹{exp.outstanding_balance:,.2f} recorded on {exp.expense_date} for '{exp.title}' ({exp.category}).",
                    category="expense_finance",
                    priority="medium",
                    farm_id=exp.farm_id,
                    related_module="expense",
                    related_record_id=f"expense-due-{exp.id}",
                    action_url="/expenses",
                )
                if notif:
                    created_count += 1
                    details.append(f"Expense payment reminder for {exp.title}")

        # -------------------------------------------------------------------
        # 7. Equipment & Machinery Maintenance
        # -------------------------------------------------------------------
        if prefs.get("equipment_maintenance", NotificationPreferenceItem(category="equipment_maintenance")).is_enabled:
            equip_notice_days = prefs["equipment_maintenance"].advance_notice_days
            equip_cutoff = today + timedelta(days=equip_notice_days)

            equipments = (
                db.query(Equipment)
                .filter(
                    Equipment.farm_id.in_(farm_ids),
                    Equipment.next_service_date.isnot(None),
                )
                .all()
            )

            for eq in equipments:
                evaluated_count += 1
                if eq.next_service_date < today:
                    notif = create_notification(
                        db=db,
                        user_id=user.id,
                        title=f"Service Overdue: {eq.equipment_name}",
                        message=f"Maintenance for {eq.equipment_type} '{eq.equipment_name}' was due on {eq.next_service_date}. Immediate inspection recommended.",
                        category="equipment_maintenance",
                        priority="urgent",
                        farm_id=eq.farm_id,
                        related_module="equipment",
                        related_record_id=f"equip-overdue-{eq.id}-{eq.next_service_date}",
                        action_url="/equipment",
                    )
                    if notif:
                        created_count += 1
                        details.append(f"Overdue maintenance alert for {eq.equipment_name}")
                elif eq.next_service_date <= equip_cutoff:
                    days_diff = (eq.next_service_date - today).days
                    time_str = "today" if days_diff == 0 else f"in {days_diff} day(s)"
                    notif = create_notification(
                        db=db,
                        user_id=user.id,
                        title=f"Maintenance Due: {eq.equipment_name}",
                        message=f"Scheduled service for {eq.equipment_type} '{eq.equipment_name}' is due {time_str} ({eq.next_service_date}).",
                        category="equipment_maintenance",
                        priority="medium",
                        farm_id=eq.farm_id,
                        related_module="equipment",
                        related_record_id=f"equip-due-{eq.id}-{eq.next_service_date}",
                        action_url="/equipment",
                    )
                    if notif:
                        created_count += 1
                        details.append(f"Upcoming maintenance alert for {eq.equipment_name}")

        # -------------------------------------------------------------------
        # 8. Farm Calendar Events (General Tasks, Crop Inspection, etc.)
        # -------------------------------------------------------------------
        if prefs.get("calendar_event", NotificationPreferenceItem(category="calendar_event")).is_enabled:
            cal_notice_days = prefs["calendar_event"].advance_notice_days
            cal_window_end = now + timedelta(days=cal_notice_days)

            general_events = (
                db.query(FarmCalendarEvent)
                .filter(
                    FarmCalendarEvent.farm_id.in_(farm_ids),
                    ~FarmCalendarEvent.activity_type.in_(["irrigation", "fertilizer_application", "pesticide_application"]),
                    FarmCalendarEvent.status == "planned",
                )
                .all()
            )

            for ev in general_events:
                evaluated_count += 1
                ev_start = ev.start_datetime
                if ev_start.tzinfo is None:
                    ev_start = ev_start.replace(tzinfo=timezone.utc)

                if ev_start <= cal_window_end and ev_start >= now - timedelta(hours=24):
                    notif = create_notification(
                        db=db,
                        user_id=user.id,
                        title=f"Upcoming Task: {ev.title}",
                        message=f"Farm activity '{ev.title}' ({ev.activity_type.replace('_', ' ').title()}) is scheduled for {ev_start.strftime('%b %d, %H:%M')}.",
                        category="calendar_event",
                        priority=ev.priority if ev.priority in ["low", "medium", "high", "urgent"] else "medium",
                        farm_id=ev.farm_id,
                        related_module="calendar",
                        related_record_id=f"cal-event-{ev.id}",
                        action_url="/calendar",
                    )
                    if notif:
                        created_count += 1
                        details.append(f"Calendar task notice for {ev.title}")

        # -------------------------------------------------------------------
        # 9. Custom Reminders Due or Overdue
        # -------------------------------------------------------------------
        if prefs.get("custom_reminder", NotificationPreferenceItem(category="custom_reminder")).is_enabled:
            reminders = (
                db.query(Reminder)
                .filter(
                    Reminder.user_id == user.id,
                    Reminder.status.in_(["pending", "overdue"]),
                )
                .all()
            )

            for rem in reminders:
                evaluated_count += 1
                rem_dt = rem.reminder_datetime
                if rem_dt.tzinfo is None:
                    rem_dt = rem_dt.replace(tzinfo=timezone.utc)

                # Check if reminder is due or overdue
                if rem_dt <= now:
                    if rem.status == "pending":
                        rem.status = "overdue"
                        db.commit()

                    notif = create_notification(
                        db=db,
                        user_id=user.id,
                        title=f"Reminder: {rem.title}",
                        message=rem.description if rem.description else f"Your reminder '{rem.title}' was scheduled for {rem_dt.strftime('%b %d, %H:%M')}.",
                        category=rem.category if rem.category in NOTIFICATION_CATEGORIES else "custom_reminder",
                        priority=rem.priority,
                        farm_id=rem.farm_id,
                        related_module="reminder",
                        related_record_id=f"rem-due-{rem.id}-{rem_dt.strftime('%Y%m%d%H%M')}",
                        action_url="/notifications",
                    )
                    if notif:
                        created_count += 1
                        details.append(f"Custom reminder notice triggered: {rem.title}")

    return ScanResultsResponse(
        scanned_at=now,
        notifications_created=created_count,
        reminders_evaluated=evaluated_count,
        details=details[:50],
    )
