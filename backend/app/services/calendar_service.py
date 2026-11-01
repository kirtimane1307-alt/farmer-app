"""Service layer for Farm Calendar & Activity Management (Phase 16)."""

import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc

from app.models.calendar import (
    FarmCalendarEvent,
    CALENDAR_ACTIVITY_TYPES,
    CALENDAR_EVENT_STATUSES,
    CALENDAR_EVENT_PRIORITIES,
)
from app.models.farm import Farm
from app.models.field import Field
from app.models.crop import Crop
from app.models.labour import Labour
from app.models.user import User
from app.schemas.calendar import (
    CalendarEventCreate,
    CalendarEventUpdate,
    CalendarEventStatusUpdate,
    CalendarEventResponse,
    CalendarSummaryResponse,
    CalendarDeleteResponse,
)

logger = logging.getLogger("farm-management.calendar-service")


class CalendarService:
    """Business logic for farm calendar scheduling, filtering, and workflow management."""

    # -------------------------------------------------------------------------
    # Validation Helpers
    # -------------------------------------------------------------------------

    @classmethod
    def _validate_hierarchy(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: UUID,
        field_id: Optional[UUID] = None,
        crop_id: Optional[UUID] = None,
        assigned_labour_id: Optional[UUID] = None,
    ) -> Farm:
        """Validate ownership of farm and ensure related field, crop, and labour belong to it."""
        # 1. Farm ownership
        farm = (
            db.query(Farm)
            .filter(and_(Farm.id == farm_id, Farm.user_id == user_id))
            .first()
        )
        if not farm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farm not found or access unauthorized.",
            )

        # 2. Field verification
        if field_id:
            field = db.query(Field).filter(Field.id == field_id).first()
            if not field:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Specified field plot does not exist.",
                )
            if field.farm_id != farm_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{field.name}' does not belong to farm '{farm.name}'.",
                )

        # 3. Crop verification
        if crop_id:
            crop = db.query(Crop).filter(Crop.id == crop_id).first()
            if not crop:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Specified crop batch does not exist.",
                )
            crop_field = db.query(Field).filter(Field.id == crop.field_id).first()
            if not crop_field or crop_field.farm_id != farm_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Crop '{crop.name}' belongs to a different farm.",
                )
            if field_id and crop.field_id != field_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Crop '{crop.name}' is registered on a different field.",
                )

        # 4. Labour verification
        if assigned_labour_id:
            labour = db.query(Labour).filter(Labour.id == assigned_labour_id).first()
            if not labour:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assigned worker record does not exist.",
                )
            if labour.farm_id != farm_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Worker '{labour.name}' is employed on a different farm.",
                )

        return farm

    @classmethod
    def _populate_event_response(cls, event: FarmCalendarEvent) -> CalendarEventResponse:
        """Convert ORM model to Pydantic schema with eager resolved metadata."""
        return CalendarEventResponse(
            id=event.id,
            farm_id=event.farm_id,
            field_id=event.field_id,
            crop_id=event.crop_id,
            assigned_labour_id=event.assigned_labour_id,
            created_by_id=event.created_by_id,
            title=event.title,
            description=event.description,
            activity_type=event.activity_type,
            start_datetime=event.start_datetime,
            end_datetime=event.end_datetime,
            all_day=event.all_day,
            status=event.status,
            priority=event.priority,
            related_module=event.related_module,
            related_record_id=event.related_record_id,
            actual_completion_datetime=event.actual_completion_datetime,
            notes=event.notes,
            created_at=event.created_at,
            updated_at=event.updated_at,
            farm_name=event.farm.name if event.farm else None,
            field_name=event.field.name if event.field else None,
            crop_name=event.crop.name if event.crop else None,
            assigned_labour_name=event.assigned_labour.name if event.assigned_labour else None,
            created_by_name=event.created_by.name if event.created_by else None,
        )

    # -------------------------------------------------------------------------
    # CRUD Operations
    # -------------------------------------------------------------------------

    @classmethod
    def create_event(
        cls,
        db: Session,
        user_id: UUID,
        payload: CalendarEventCreate,
    ) -> CalendarEventResponse:
        """Create a new farm calendar activity with relational integrity checks."""
        # Validate ownership & hierarchy
        farm = cls._validate_hierarchy(
            db,
            user_id=user_id,
            farm_id=payload.farm_id,
            field_id=payload.field_id,
            crop_id=payload.crop_id,
            assigned_labour_id=payload.assigned_labour_id,
        )

        # Validate datetime ordering
        if payload.end_datetime and payload.end_datetime < payload.start_datetime:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End date/time cannot precede start date/time.",
            )

        # Set completion timestamp if created as completed
        actual_completion = payload.actual_completion_datetime
        if payload.status == "completed" and not actual_completion:
            actual_completion = datetime.now(timezone.utc)

        event = FarmCalendarEvent(
            farm_id=payload.farm_id,
            field_id=payload.field_id,
            crop_id=payload.crop_id,
            assigned_labour_id=payload.assigned_labour_id,
            created_by_id=user_id,
            title=payload.title.strip(),
            description=payload.description.strip() if payload.description else None,
            activity_type=payload.activity_type,
            start_datetime=payload.start_datetime,
            end_datetime=payload.end_datetime,
            all_day=payload.all_day,
            status=payload.status,
            priority=payload.priority,
            related_module=payload.related_module.strip() if payload.related_module else None,
            related_record_id=payload.related_record_id.strip() if payload.related_record_id else None,
            actual_completion_datetime=actual_completion,
            notes=payload.notes.strip() if payload.notes else None,
        )

        db.add(event)
        db.commit()
        db.refresh(event)

        logger.info(
            f"Created calendar event {event.id} ('{event.title}') under farm '{farm.name}' "
            f"by user {user_id}"
        )
        return cls._populate_event_response(event)

    @classmethod
    def get_events(
        cls,
        db: Session,
        user_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        crop_id: Optional[UUID] = None,
        activity_type: Optional[str] = None,
        status_filter: Optional[str] = None,
        priority: Optional[str] = None,
        assigned_labour_id: Optional[UUID] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 500,
    ) -> List[CalendarEventResponse]:
        """Query calendar events with tenant scope, date range overlap, and multi-faceted filtering."""
        query = (
            db.query(FarmCalendarEvent)
            .join(Farm, FarmCalendarEvent.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
            .options(
                joinedload(FarmCalendarEvent.farm),
                joinedload(FarmCalendarEvent.field),
                joinedload(FarmCalendarEvent.crop),
                joinedload(FarmCalendarEvent.assigned_labour),
                joinedload(FarmCalendarEvent.created_by),
            )
        )

        # Date range overlap logic
        if start_date and end_date:
            if end_date < start_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Requested end date cannot precede start date.",
                )
            query = query.filter(
                and_(
                    FarmCalendarEvent.start_datetime <= end_date,
                    func.coalesce(FarmCalendarEvent.end_datetime, FarmCalendarEvent.start_datetime) >= start_date,
                )
            )
        elif start_date:
            query = query.filter(
                func.coalesce(FarmCalendarEvent.end_datetime, FarmCalendarEvent.start_datetime) >= start_date
            )
        elif end_date:
            query = query.filter(FarmCalendarEvent.start_datetime <= end_date)

        # Filters
        if farm_id:
            query = query.filter(FarmCalendarEvent.farm_id == farm_id)
        if field_id:
            query = query.filter(FarmCalendarEvent.field_id == field_id)
        if crop_id:
            query = query.filter(FarmCalendarEvent.crop_id == crop_id)
        if activity_type:
            query = query.filter(FarmCalendarEvent.activity_type == activity_type.strip().lower())
        if status_filter:
            query = query.filter(FarmCalendarEvent.status == status_filter.strip().lower())
        if priority:
            query = query.filter(FarmCalendarEvent.priority == priority.strip().lower())
        if assigned_labour_id:
            query = query.filter(FarmCalendarEvent.assigned_labour_id == assigned_labour_id)
        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    FarmCalendarEvent.title.ilike(term),
                    FarmCalendarEvent.description.ilike(term),
                    FarmCalendarEvent.notes.ilike(term),
                )
            )

        events = (
            query.order_by(asc(FarmCalendarEvent.start_datetime), desc(FarmCalendarEvent.priority))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [cls._populate_event_response(e) for e in events]

    @classmethod
    def get_event_by_id(cls, db: Session, event_id: UUID, user_id: UUID) -> CalendarEventResponse:
        """Fetch a single event ensuring strict tenant isolation."""
        event = (
            db.query(FarmCalendarEvent)
            .join(Farm, FarmCalendarEvent.farm_id == Farm.id)
            .filter(and_(FarmCalendarEvent.id == event_id, Farm.user_id == user_id))
            .options(
                joinedload(FarmCalendarEvent.farm),
                joinedload(FarmCalendarEvent.field),
                joinedload(FarmCalendarEvent.crop),
                joinedload(FarmCalendarEvent.assigned_labour),
                joinedload(FarmCalendarEvent.created_by),
            )
            .first()
        )
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Calendar activity not found or access unauthorized.",
            )
        return cls._populate_event_response(event)

    @classmethod
    def update_event(
        cls,
        db: Session,
        event_id: UUID,
        user_id: UUID,
        payload: CalendarEventUpdate,
    ) -> CalendarEventResponse:
        """Update activity fields with hierarchy verification and status handling."""
        event = (
            db.query(FarmCalendarEvent)
            .join(Farm, FarmCalendarEvent.farm_id == Farm.id)
            .filter(and_(FarmCalendarEvent.id == event_id, Farm.user_id == user_id))
            .first()
        )
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Calendar activity not found or access unauthorized.",
            )

        # Hierarchy validation if relational targets are altered
        target_farm_id = payload.farm_id if payload.farm_id is not None else event.farm_id
        target_field_id = payload.field_id if payload.field_id is not None else event.field_id
        target_crop_id = payload.crop_id if payload.crop_id is not None else event.crop_id
        target_labour_id = (
            payload.assigned_labour_id
            if payload.assigned_labour_id is not None
            else event.assigned_labour_id
        )

        cls._validate_hierarchy(
            db,
            user_id=user_id,
            farm_id=target_farm_id,
            field_id=target_field_id,
            crop_id=target_crop_id,
            assigned_labour_id=target_labour_id,
        )

        # Validate start & end dates
        new_start = payload.start_datetime if payload.start_datetime is not None else event.start_datetime
        new_end = payload.end_datetime if payload.end_datetime is not None else event.end_datetime
        if new_end and new_end < new_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End date/time cannot precede start date/time.",
            )

        # Apply updates
        if payload.farm_id is not None:
            event.farm_id = payload.farm_id
        if payload.field_id is not None:
            event.field_id = payload.field_id
        if payload.crop_id is not None:
            event.crop_id = payload.crop_id
        if payload.assigned_labour_id is not None:
            event.assigned_labour_id = payload.assigned_labour_id
        if payload.title is not None:
            event.title = payload.title.strip()
        if payload.description is not None:
            event.description = payload.description.strip() or None
        if payload.activity_type is not None:
            event.activity_type = payload.activity_type
        if payload.start_datetime is not None:
            event.start_datetime = payload.start_datetime
        if payload.end_datetime is not None:
            event.end_datetime = payload.end_datetime
        if payload.all_day is not None:
            event.all_day = payload.all_day
        if payload.priority is not None:
            event.priority = payload.priority
        if payload.related_module is not None:
            event.related_module = payload.related_module.strip() or None
        if payload.related_record_id is not None:
            event.related_record_id = payload.related_record_id.strip() or None
        if payload.notes is not None:
            event.notes = payload.notes.strip() or None

        # Workflow status & completion tracking
        if payload.status is not None:
            old_status = event.status
            event.status = payload.status
            if payload.status == "completed":
                event.actual_completion_datetime = (
                    payload.actual_completion_datetime or datetime.now(timezone.utc)
                )
            elif old_status == "completed" and payload.status != "completed":
                event.actual_completion_datetime = payload.actual_completion_datetime  # may be None

        elif payload.actual_completion_datetime is not None:
            event.actual_completion_datetime = payload.actual_completion_datetime

        db.commit()
        db.refresh(event)

        logger.info(f"Updated calendar event {event.id} by user {user_id}")
        return cls._populate_event_response(event)

    @classmethod
    def update_event_status(
        cls,
        db: Session,
        event_id: UUID,
        user_id: UUID,
        payload: CalendarEventStatusUpdate,
    ) -> CalendarEventResponse:
        """Fast status update endpoint with completion timestamp auto-tracking."""
        event = (
            db.query(FarmCalendarEvent)
            .join(Farm, FarmCalendarEvent.farm_id == Farm.id)
            .filter(and_(FarmCalendarEvent.id == event_id, Farm.user_id == user_id))
            .first()
        )
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Calendar activity not found or access unauthorized.",
            )

        old_status = event.status
        event.status = payload.status

        if payload.status == "completed":
            event.actual_completion_datetime = (
                payload.actual_completion_datetime or datetime.now(timezone.utc)
            )
        elif old_status == "completed" and payload.status != "completed":
            # Reopening an activity clears or overrides completion datetime
            event.actual_completion_datetime = payload.actual_completion_datetime

        if payload.notes:
            existing = event.notes or ""
            note_entry = f"[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}] Status changed to {payload.status}: {payload.notes.strip()}"
            event.notes = f"{existing}\n{note_entry}".strip()

        db.commit()
        db.refresh(event)

        logger.info(
            f"Calendar event {event.id} status changed: {old_status} -> {payload.status} by user {user_id}"
        )
        return cls._populate_event_response(event)

    @classmethod
    def delete_event(cls, db: Session, event_id: UUID, user_id: UUID) -> CalendarDeleteResponse:
        """Safely delete a calendar activity."""
        event = (
            db.query(FarmCalendarEvent)
            .join(Farm, FarmCalendarEvent.farm_id == Farm.id)
            .filter(and_(FarmCalendarEvent.id == event_id, Farm.user_id == user_id))
            .first()
        )
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Calendar activity not found or access unauthorized.",
            )

        event_title = event.title
        db.delete(event)
        db.commit()

        logger.info(f"Deleted calendar event {event_id} ('{event_title}') by user {user_id}")
        return CalendarDeleteResponse(
            success=True,
            message=f"Calendar activity '{event_title}' deleted successfully.",
            deleted_event_id=event_id,
        )

    @classmethod
    def get_calendar_summary(
        cls,
        db: Session,
        user_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        farm_id: Optional[UUID] = None,
    ) -> CalendarSummaryResponse:
        """Calculate aggregated KPI metrics for calendar events."""
        query = (
            db.query(FarmCalendarEvent)
            .join(Farm, FarmCalendarEvent.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )

        if farm_id:
            query = query.filter(FarmCalendarEvent.farm_id == farm_id)

        if start_date and end_date:
            query = query.filter(
                and_(
                    FarmCalendarEvent.start_datetime <= end_date,
                    func.coalesce(FarmCalendarEvent.end_datetime, FarmCalendarEvent.start_datetime) >= start_date,
                )
            )

        events = query.all()
        now_dt = datetime.now(timezone.utc)

        total = len(events)
        planned = 0
        in_progress = 0
        completed = 0
        cancelled = 0
        overdue = 0
        high_priority = 0
        activity_breakdown: Dict[str, int] = {}

        for e in events:
            # Status counts
            if e.status == "planned":
                planned += 1
            elif e.status == "in_progress":
                in_progress += 1
            elif e.status == "completed":
                completed += 1
            elif e.status == "cancelled":
                cancelled += 1

            # Priority
            if e.priority == "high":
                high_priority += 1

            # Overdue check: active and finish time has passed
            finish_time = e.end_datetime or e.start_datetime
            if finish_time and e.status in ("planned", "in_progress"):
                # Ensure tz comparison
                finish_tz = finish_time if finish_time.tzinfo else finish_time.replace(tzinfo=timezone.utc)
                if finish_tz < now_dt:
                    overdue += 1

            # Activity type distribution
            activity_breakdown[e.activity_type] = activity_breakdown.get(e.activity_type, 0) + 1

        return CalendarSummaryResponse(
            total_events=total,
            planned_count=planned,
            in_progress_count=in_progress,
            completed_count=completed,
            cancelled_count=cancelled,
            overdue_count=overdue,
            high_priority_count=high_priority,
            activity_breakdown=activity_breakdown,
        )
