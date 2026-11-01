"""Attendance management business logic service."""

import logging
from datetime import date, time
from typing import List, Optional, Tuple
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.farm import Farm
from app.models.labour import Labour
from app.models.attendance import Attendance
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceUpdate,
    AttendanceResponse,
    AttendanceDeleteResponse,
    BulkAttendanceCreate,
    BulkAttendanceResponse,
    AttendanceDailySummary,
    format_minutes_display,
)

logger = logging.getLogger("farm-management.attendance-service")


class AttendanceService:
    """Service implementing CRUD operations, time calculation, bulk logging, and tenant isolation."""

    @staticmethod
    def calculate_working_minutes(
        status_value: str,
        check_in: Optional[time],
        check_out: Optional[time],
    ) -> int:
        """
        Authoritatively calculates working duration in integer minutes.

        Rules:
        1. 'absent' and 'leave' always yield 0 minutes.
        2. If both check_in and check_out are provided:
           - Same day (check_out >= check_in): duration = check_out - check_in
           - Overnight shift (check_out < check_in): crosses midnight into next morning
             duration = (1440 - check_in_mins) + check_out_mins
        3. If neither time is provided:
           - 'present' defaults to standard 8 hours (480 minutes)
           - 'half_day' defaults to standard 4 hours (240 minutes)
        4. If only check_in is provided (ongoing shift): returns 0 minutes until clock-out.
        """
        clean_status = status_value.lower()
        if clean_status in ("absent", "leave"):
            return 0

        if check_in is not None and check_out is not None:
            t_in = check_in.hour * 60 + check_in.minute
            t_out = check_out.hour * 60 + check_out.minute
            if t_out >= t_in:
                return t_out - t_in
            else:
                # Overnight shift spanning past midnight
                return (1440 - t_in) + t_out

        if check_in is None and check_out is None:
            if clean_status == "present":
                return 480  # 8 hours standard
            elif clean_status == "half_day":
                return 240  # 4 hours standard

        # Partial punch (e.g. checked in, check-out pending)
        return 0

    @staticmethod
    def _validate_attendance_rules(
        status_value: str,
        working_minutes: int,
        overtime_minutes: int,
    ) -> Tuple[int, int]:
        """
        Validates business constraints on working duration and approved overtime.
        Returns normalized (working_minutes, overtime_minutes).
        """
        clean_status = status_value.lower()
        if clean_status in ("absent", "leave"):
            return 0, 0

        if overtime_minutes < 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Overtime minutes cannot be negative.",
            )

        if working_minutes > 0 and overtime_minutes > working_minutes:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Approved overtime ({overtime_minutes}m) cannot exceed total working time ({working_minutes}m).",
            )

        return working_minutes, overtime_minutes

    @staticmethod
    def _to_attendance_response(
        att: Attendance,
        labour: Optional[Labour] = None,
        farm: Optional[Farm] = None,
    ) -> AttendanceResponse:
        """Helper to build rich AttendanceResponse including labour & farm metadata."""
        resolved_labour = labour or att.labour
        resolved_farm = farm or (resolved_labour.farm if resolved_labour else None)

        return AttendanceResponse(
            id=att.id,
            labour_id=att.labour_id,
            labour_name=resolved_labour.name if resolved_labour else None,
            farm_id=resolved_farm.id if resolved_farm else None,
            farm_name=resolved_farm.name if resolved_farm else None,
            work_type=resolved_labour.work_type if resolved_labour else None,
            daily_wage=resolved_labour.daily_wage if resolved_labour else None,
            attendance_date=att.attendance_date,
            status=att.status,
            check_in=att.check_in,
            check_out=att.check_out,
            working_minutes=att.working_minutes,
            working_hours_formatted=format_minutes_display(att.working_minutes),
            overtime_minutes=att.overtime_minutes,
            overtime_hours_formatted=format_minutes_display(att.overtime_minutes),
            notes=att.notes,
            created_at=att.created_at,
            updated_at=att.updated_at,
        )

    @staticmethod
    def list_attendance(
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        labour_id: Optional[UUID] = None,
        attendance_date: Optional[date] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[AttendanceResponse]:
        """
        List attendance records for workers on farms owned by the authenticated user.
        Supports multi-criteria filtering: farm, worker, specific date, date range, status, search.
        """
        query = (
            db.query(Attendance, Labour, Farm)
            .join(Labour, Attendance.labour_id == Labour.id)
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )

        if farm_id:
            farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == user_id).first()
            if not farm:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Farm not found or access unauthorized",
                )
            query = query.filter(Labour.farm_id == farm_id)

        if labour_id:
            labour = (
                db.query(Labour)
                .join(Farm, Labour.farm_id == Farm.id)
                .filter(Labour.id == labour_id, Farm.user_id == user_id)
                .first()
            )
            if not labour:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Worker not found or access unauthorized",
                )
            query = query.filter(Attendance.labour_id == labour_id)

        if attendance_date:
            query = query.filter(Attendance.attendance_date == attendance_date)

        if start_date:
            query = query.filter(Attendance.attendance_date >= start_date)

        if end_date:
            query = query.filter(Attendance.attendance_date <= end_date)

        if status_filter:
            clean_status = status_filter.strip().lower()
            query = query.filter(Attendance.status == clean_status)

        if search:
            term = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Labour.name).like(term),
                    func.lower(Labour.work_type).like(term),
                    func.lower(Farm.name).like(term),
                )
            )

        query = query.order_by(
            Attendance.attendance_date.desc(),
            Labour.name.asc(),
        )

        results = query.all()
        return [
            AttendanceService._to_attendance_response(att, lab, farm)
            for att, lab, farm in results
        ]

    @staticmethod
    def get_attendance_by_id(
        db: Session,
        attendance_id: UUID,
        user_id: UUID,
    ) -> AttendanceResponse:
        """Fetch attendance record by ID, verifying tenant ownership."""
        result = (
            db.query(Attendance, Labour, Farm)
            .join(Labour, Attendance.labour_id == Labour.id)
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(Attendance.id == attendance_id, Farm.user_id == user_id)
            .first()
        )

        if not result:
            logger.warning(f"Attendance {attendance_id} not found or unauthorized for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found or access unauthorized",
            )

        att, lab, farm = result
        return AttendanceService._to_attendance_response(att, lab, farm)

    @staticmethod
    def create_attendance(
        db: Session,
        user_id: UUID,
        attendance_in: AttendanceCreate,
        target_labour_id: Optional[UUID] = None,
    ) -> AttendanceResponse:
        """
        Record a new attendance entry for a worker.
        Enforces tenant ownership and prevents duplicate entries per worker per date.
        """
        resolved_labour_id = target_labour_id or attendance_in.labour_id
        if not resolved_labour_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="labour_id is required in request body or route parameter",
            )

        # Verify worker exists and belongs to a farm owned by current user
        worker_record = (
            db.query(Labour, Farm)
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(Labour.id == resolved_labour_id, Farm.user_id == user_id)
            .first()
        )
        if not worker_record:
            logger.warning(f"Worker {resolved_labour_id} unauthorized or nonexistent for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Worker not found or access unauthorized",
            )
        labour, farm = worker_record

        # Check unique constraint (labour_id + attendance_date)
        existing = (
            db.query(Attendance)
            .filter(
                Attendance.labour_id == resolved_labour_id,
                Attendance.attendance_date == attendance_in.attendance_date,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Attendance already recorded for worker '{labour.name}' on "
                    f"{attendance_in.attendance_date}. Please update the existing record."
                ),
            )

        # Calculate authoritative working minutes
        working_mins = AttendanceService.calculate_working_minutes(
            attendance_in.status,
            attendance_in.check_in,
            attendance_in.check_out,
        )
        working_mins, overtime_mins = AttendanceService._validate_attendance_rules(
            attendance_in.status,
            working_mins,
            attendance_in.overtime_minutes,
        )

        # Clear times for absent/leave
        clean_in = attendance_in.check_in if attendance_in.status not in ("absent", "leave") else None
        clean_out = attendance_in.check_out if attendance_in.status not in ("absent", "leave") else None

        new_att = Attendance(
            labour_id=resolved_labour_id,
            attendance_date=attendance_in.attendance_date,
            status=attendance_in.status,
            check_in=clean_in,
            check_out=clean_out,
            working_minutes=working_mins,
            overtime_minutes=overtime_mins,
            notes=attendance_in.notes.strip() if attendance_in.notes else None,
        )

        db.add(new_att)
        db.commit()
        db.refresh(new_att)

        logger.info(
            f"Logged attendance {new_att.id} for worker {labour.name} on "
            f"{attendance_in.attendance_date} (status={new_att.status}, hours={working_mins}m)"
        )
        return AttendanceService._to_attendance_response(new_att, labour, farm)

    @staticmethod
    def update_attendance(
        db: Session,
        attendance_id: UUID,
        user_id: UUID,
        attendance_update: AttendanceUpdate,
    ) -> AttendanceResponse:
        """
        Update an existing attendance record, recalculating working duration and validating overtime.
        """
        result = (
            db.query(Attendance, Labour, Farm)
            .join(Labour, Attendance.labour_id == Labour.id)
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(Attendance.id == attendance_id, Farm.user_id == user_id)
            .first()
        )
        if not result:
            logger.warning(f"Attendance update unauthorized: id={attendance_id}, user={user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found or access unauthorized",
            )
        att, labour, farm = result

        update_dict = attendance_update.model_dump(exclude_unset=True)

        new_status = update_dict.get("status", att.status)
        new_in = update_dict.get("check_in", att.check_in)
        new_out = update_dict.get("check_out", att.check_out)
        new_ot = update_dict.get("overtime_minutes", att.overtime_minutes)

        # If date is changing, verify no collision
        if "attendance_date" in update_dict and update_dict["attendance_date"] != att.attendance_date:
            dup = (
                db.query(Attendance)
                .filter(
                    Attendance.labour_id == att.labour_id,
                    Attendance.attendance_date == update_dict["attendance_date"],
                    Attendance.id != att.id,
                )
                .first()
            )
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Worker already has an attendance record on {update_dict['attendance_date']}.",
                )
            att.attendance_date = update_dict["attendance_date"]

        # Recalculate working duration
        working_mins = AttendanceService.calculate_working_minutes(new_status, new_in, new_out)
        working_mins, overtime_mins = AttendanceService._validate_attendance_rules(
            new_status, working_mins, new_ot
        )

        att.status = new_status
        if new_status in ("absent", "leave"):
            att.check_in = None
            att.check_out = None
        else:
            att.check_in = new_in
            att.check_out = new_out
        att.working_minutes = working_mins
        att.overtime_minutes = overtime_mins

        if "notes" in update_dict:
            att.notes = update_dict["notes"].strip() if update_dict["notes"] else None

        db.commit()
        db.refresh(att)

        logger.info(f"Updated attendance {att.id} for worker {labour.name}")
        return AttendanceService._to_attendance_response(att, labour, farm)

    @staticmethod
    def delete_attendance(
        db: Session,
        attendance_id: UUID,
        user_id: UUID,
    ) -> AttendanceDeleteResponse:
        """Delete an attendance record with ownership verification."""
        result = (
            db.query(Attendance, Labour, Farm)
            .join(Labour, Attendance.labour_id == Labour.id)
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(Attendance.id == attendance_id, Farm.user_id == user_id)
            .first()
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found or access unauthorized",
            )
        att, labour, _ = result

        db.delete(att)
        db.commit()

        logger.info(f"Deleted attendance record {attendance_id} for worker {labour.name}")
        return AttendanceDeleteResponse(
            id=attendance_id,
            deleted=True,
            message=f"Attendance log for {labour.name} on {att.attendance_date} deleted successfully.",
        )

    @staticmethod
    def bulk_create_or_update(
        db: Session,
        user_id: UUID,
        bulk_in: BulkAttendanceCreate,
    ) -> BulkAttendanceResponse:
        """
        Process bulk attendance roster for a specific date.
        If a record for (worker, date) already exists, updates it.
        Otherwise creates a new record.
        Strictly validates tenant ownership for every labour_id in the payload.
        """
        target_date = bulk_in.attendance_date
        records_to_return: List[AttendanceResponse] = []
        errors: List[str] = []
        created_count = 0
        updated_count = 0

        # Pre-fetch all valid workers for this user (and optional farm)
        worker_query = (
            db.query(Labour, Farm)
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )
        if bulk_in.farm_id:
            worker_query = worker_query.filter(Labour.farm_id == bulk_in.farm_id)

        valid_workers = {str(lab.id): (lab, farm) for lab, farm in worker_query.all()}

        for item in bulk_in.records:
            lab_id_str = str(item.labour_id)
            if lab_id_str not in valid_workers:
                err_msg = f"Worker ID {item.labour_id} not found or unauthorized on your estates."
                errors.append(err_msg)
                continue

            labour, farm = valid_workers[lab_id_str]

            try:
                working_mins = AttendanceService.calculate_working_minutes(
                    item.status, item.check_in, item.check_out
                )
                working_mins, overtime_mins = AttendanceService._validate_attendance_rules(
                    item.status, working_mins, item.overtime_minutes
                )
            except HTTPException as e:
                errors.append(f"Worker {labour.name}: {e.detail}")
                continue

            clean_in = item.check_in if item.status not in ("absent", "leave") else None
            clean_out = item.check_out if item.status not in ("absent", "leave") else None
            clean_notes = item.notes.strip() if item.notes else None

            # Look up existing attendance record for (worker, date)
            existing_att = (
                db.query(Attendance)
                .filter(
                    Attendance.labour_id == item.labour_id,
                    Attendance.attendance_date == target_date,
                )
                .first()
            )

            if existing_att:
                existing_att.status = item.status
                existing_att.check_in = clean_in
                existing_att.check_out = clean_out
                existing_att.working_minutes = working_mins
                existing_att.overtime_minutes = overtime_mins
                if clean_notes is not None:
                    existing_att.notes = clean_notes
                updated_count += 1
                att_record = existing_att
            else:
                att_record = Attendance(
                    labour_id=item.labour_id,
                    attendance_date=target_date,
                    status=item.status,
                    check_in=clean_in,
                    check_out=clean_out,
                    working_minutes=working_mins,
                    overtime_minutes=overtime_mins,
                    notes=clean_notes,
                )
                db.add(att_record)
                created_count += 1

            db.commit()
            db.refresh(att_record)
            records_to_return.append(
                AttendanceService._to_attendance_response(att_record, labour, farm)
            )

        return BulkAttendanceResponse(
            attendance_date=target_date,
            total_submitted=len(bulk_in.records),
            created=created_count,
            updated=updated_count,
            failed=len(errors),
            records=records_to_return,
            errors=errors,
        )

    @staticmethod
    def get_daily_summary(
        db: Session,
        user_id: UUID,
        target_date: date,
        farm_id: Optional[UUID] = None,
    ) -> AttendanceDailySummary:
        """
        Aggregate attendance counts and hours logged for a target date.
        Calculates present, absent, half_day, leave, and unmarked workers.
        """
        worker_query = (
            db.query(Labour)
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(Farm.user_id == user_id, Labour.status == "active")
        )
        if farm_id:
            worker_query = worker_query.filter(Labour.farm_id == farm_id)

        total_active_workers = worker_query.count()

        att_query = (
            db.query(Attendance)
            .join(Labour, Attendance.labour_id == Labour.id)
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(
                Farm.user_id == user_id,
                Attendance.attendance_date == target_date,
            )
        )
        if farm_id:
            att_query = att_query.filter(Labour.farm_id == farm_id)

        attendance_records = att_query.all()

        present_cnt = sum(1 for a in attendance_records if a.status == "present")
        absent_cnt = sum(1 for a in attendance_records if a.status == "absent")
        half_day_cnt = sum(1 for a in attendance_records if a.status == "half_day")
        leave_cnt = sum(1 for a in attendance_records if a.status == "leave")
        marked_cnt = len(attendance_records)
        unmarked_cnt = max(0, total_active_workers - marked_cnt)

        total_working_mins = sum(a.working_minutes for a in attendance_records)
        total_ot_mins = sum(a.overtime_minutes for a in attendance_records)

        return AttendanceDailySummary(
            attendance_date=target_date,
            total_workers=total_active_workers,
            present=present_cnt,
            absent=absent_cnt,
            half_day=half_day_cnt,
            leave=leave_cnt,
            unmarked=unmarked_cnt,
            total_working_minutes=total_working_mins,
            total_working_hours_formatted=format_minutes_display(total_working_mins),
            total_overtime_minutes=total_ot_mins,
            total_overtime_hours_formatted=format_minutes_display(total_ot_mins),
        )
