"""Salary and Labour Payment business logic service."""

import json
import logging
from datetime import date
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc

from app.models.farm import Farm
from app.models.labour import Labour
from app.models.attendance import Attendance
from app.models.salary import SalaryRecord, SalaryPayment
from app.schemas.attendance import format_minutes_display
from app.schemas.salary import (
    SalaryPreviewRequest,
    SalaryPreviewResponse,
    AttendanceBreakdown,
    SalaryCreate,
    SalaryUpdate,
    SalaryResponse,
    SalarySummaryResponse,
    SalaryDeleteResponse,
    PaymentCreate,
    PaymentResponse,
)

logger = logging.getLogger("farm-management.salary-service")

CALCULATION_POLICY_TEXT = (
    "Explicit Calculation Policy: "
    "1. Present day = 1.0 payable attendance unit. "
    "2. Half day = 0.5 payable attendance unit. "
    "3. Absent day = 0.0 units (unpaid). "
    "4. Leave day = 0.0 units (unpaid standard policy). "
    "5. Overtime is tracked in minutes separately and only added if explicit approved overtime compensation is provided. "
    "6. Daily wage is preserved as an immutable snapshot upon salary record creation."
)


class SalaryService:
    """Service handling salary previews, authoritative generation, and payment ledger management."""

    @staticmethod
    def _get_labour_with_tenant_check(db: Session, labour_id: UUID, user_id: UUID) -> Tuple[Labour, Farm]:
        """Verify worker exists on a farm owned by the authenticated user."""
        result = (
            db.query(Labour, Farm)
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(Labour.id == labour_id, Farm.user_id == user_id)
            .first()
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Worker not found or access unauthorized",
            )
        return result

    @staticmethod
    def _compute_period_attendance(
        db: Session, labour_id: UUID, period_start: date, period_end: date
    ) -> Tuple[AttendanceBreakdown, int]:
        """
        Calculates attendance units and metrics for the given worker in the date interval.
        Returns AttendanceBreakdown and total overtime minutes.
        """
        records: List[Attendance] = (
            db.query(Attendance)
            .filter(
                Attendance.labour_id == labour_id,
                Attendance.attendance_date >= period_start,
                Attendance.attendance_date <= period_end,
            )
            .all()
        )

        total_days = (period_end - period_start).days + 1
        present_count = 0
        half_day_count = 0
        absent_count = 0
        leave_count = 0
        total_overtime_minutes = 0

        for r in records:
            clean_status = (r.status or "").lower()
            if clean_status == "present":
                present_count += 1
            elif clean_status == "half_day":
                half_day_count += 1
            elif clean_status == "absent":
                absent_count += 1
            elif clean_status == "leave":
                leave_count += 1

            if r.overtime_minutes and r.overtime_minutes > 0:
                total_overtime_minutes += r.overtime_minutes

        unmarked = max(0, total_days - len(records))
        payable_units = Decimal(str(present_count)) + (Decimal(str(half_day_count)) * Decimal("0.5"))

        breakdown = AttendanceBreakdown(
            total_days_in_period=total_days,
            attendance_records_count=len(records),
            present_days=Decimal(str(present_count)),
            half_days=half_day_count,
            absent_days=absent_count,
            leave_days=leave_count,
            unmarked_days=unmarked,
            payable_units=payable_units,
            total_overtime_minutes=total_overtime_minutes,
            total_overtime_hours_formatted=format_minutes_display(total_overtime_minutes),
        )
        return breakdown, total_overtime_minutes

    @staticmethod
    def preview_salary(
        db: Session, user_id: UUID, preview_in: SalaryPreviewRequest
    ) -> SalaryPreviewResponse:
        """
        Authoritatively calculates salary preview breakdown without mutating database state.
        Ensures farm tenant ownership, checks for duplicate existing records, and computes exact Decimals.
        """
        labour, farm = SalaryService._get_labour_with_tenant_check(db, preview_in.labour_id, user_id)

        if not labour.daily_wage or Decimal(str(labour.daily_wage)) <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Worker '{labour.name}' has no daily wage configured. Please set a positive daily wage on their profile first.",
            )

        daily_wage = Decimal(str(labour.daily_wage)).quantize(Decimal("0.01"))
        attendance_breakdown, total_ot_mins = SalaryService._compute_period_attendance(
            db, labour.id, preview_in.period_start, preview_in.period_end
        )

        # Financial breakdown calculations
        regular_salary = (attendance_breakdown.payable_units * daily_wage).quantize(Decimal("0.01"))
        approved_ot = (preview_in.approved_overtime_pay or Decimal("0.00")).quantize(Decimal("0.01"))
        additional_earnings = (preview_in.additional_earnings or Decimal("0.00")).quantize(Decimal("0.01"))
        deductions = (preview_in.deductions or Decimal("0.00")).quantize(Decimal("0.01"))

        gross_salary = (regular_salary + approved_ot + additional_earnings).quantize(Decimal("0.01"))
        net_salary = max(Decimal("0.00"), gross_salary - deductions).quantize(Decimal("0.01"))

        # Check if already generated
        existing = (
            db.query(SalaryRecord)
            .filter(
                SalaryRecord.labour_id == labour.id,
                SalaryRecord.period_start == preview_in.period_start,
                SalaryRecord.period_end == preview_in.period_end,
            )
            .first()
        )

        return SalaryPreviewResponse(
            labour_id=labour.id,
            labour_name=labour.name,
            farm_id=farm.id,
            farm_name=farm.name,
            work_type=labour.work_type,
            period_start=preview_in.period_start,
            period_end=preview_in.period_end,
            daily_wage_snapshot=daily_wage,
            attendance=attendance_breakdown,
            regular_salary=regular_salary,
            approved_overtime_pay=approved_ot,
            additional_earnings=additional_earnings,
            deductions=deductions,
            gross_salary=gross_salary,
            net_salary=net_salary,
            amount_paid=existing.amount_paid if existing else Decimal("0.00"),
            outstanding_balance=existing.outstanding_balance if existing else net_salary,
            status=existing.status if existing else "draft",
            notes=preview_in.notes or (existing.notes if existing else None),
            calculation_policy=CALCULATION_POLICY_TEXT,
            is_already_generated=existing is not None,
            existing_salary_id=existing.id if existing else None,
        )

    @staticmethod
    def create_salary(db: Session, user_id: UUID, salary_in: SalaryCreate) -> SalaryResponse:
        """
        Creates and stores a permanent salary record for the worker and period.
        Preserves daily wage snapshot, checks duplicate constraints, and sets initial status.
        """
        labour, farm = SalaryService._get_labour_with_tenant_check(db, salary_in.labour_id, user_id)

        if not labour.daily_wage or Decimal(str(labour.daily_wage)) <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Worker '{labour.name}' has no daily wage configured.",
            )

        # Duplicate check
        existing = (
            db.query(SalaryRecord)
            .filter(
                SalaryRecord.labour_id == labour.id,
                SalaryRecord.period_start == salary_in.period_start,
                SalaryRecord.period_end == salary_in.period_end,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Salary record for '{labour.name}' covering {salary_in.period_start} to {salary_in.period_end} already exists (ID: {existing.id}).",
            )

        daily_wage_snapshot = Decimal(str(labour.daily_wage)).quantize(Decimal("0.01"))
        attendance_breakdown, total_ot_mins = SalaryService._compute_period_attendance(
            db, labour.id, salary_in.period_start, salary_in.period_end
        )

        regular_salary = (attendance_breakdown.payable_units * daily_wage_snapshot).quantize(Decimal("0.01"))
        approved_ot = (salary_in.approved_overtime_pay or Decimal("0.00")).quantize(Decimal("0.01"))
        additional_earnings = (salary_in.additional_earnings or Decimal("0.00")).quantize(Decimal("0.01"))
        deductions = (salary_in.deductions or Decimal("0.00")).quantize(Decimal("0.01"))

        gross_salary = (regular_salary + approved_ot + additional_earnings).quantize(Decimal("0.01"))
        net_salary = max(Decimal("0.00"), gross_salary - deductions).quantize(Decimal("0.01"))

        status_value = "paid" if net_salary == Decimal("0.00") else "generated"

        metadata_dict = {
            "total_days_in_period": attendance_breakdown.total_days_in_period,
            "attendance_records_count": attendance_breakdown.attendance_records_count,
            "unmarked_days": attendance_breakdown.unmarked_days,
            "total_overtime_minutes": total_ot_mins,
            "total_overtime_hours": attendance_breakdown.total_overtime_hours_formatted,
            "policy": CALCULATION_POLICY_TEXT,
        }

        salary_record = SalaryRecord(
            labour_id=labour.id,
            farm_id=farm.id,
            period_start=salary_in.period_start,
            period_end=salary_in.period_end,
            daily_wage_snapshot=daily_wage_snapshot,
            present_days=attendance_breakdown.present_days,
            half_days=attendance_breakdown.half_days,
            absent_days=attendance_breakdown.absent_days,
            leave_days=attendance_breakdown.leave_days,
            payable_units=attendance_breakdown.payable_units,
            regular_salary=regular_salary,
            overtime_pay=approved_ot,
            additional_earnings=additional_earnings,
            deductions=deductions,
            gross_salary=gross_salary,
            net_salary=net_salary,
            amount_paid=Decimal("0.00"),
            outstanding_balance=net_salary,
            status=status_value,
            notes=salary_in.notes,
            calculation_metadata=json.dumps(metadata_dict),
        )

        db.add(salary_record)
        db.commit()
        db.refresh(salary_record)

        return SalaryService._to_salary_response(salary_record, labour, farm)

    @staticmethod
    def _to_salary_response(
        salary: SalaryRecord, labour: Optional[Labour] = None, farm: Optional[Farm] = None
    ) -> SalaryResponse:
        """Map SalaryRecord ORM entity to API response model."""
        labour_obj = labour or salary.labour
        farm_obj = farm or (salary.farm if hasattr(salary, "farm") else None)

        payments_list = [
            PaymentResponse(
                id=p.id,
                salary_record_id=p.salary_record_id,
                amount=p.amount,
                payment_date=p.payment_date,
                payment_method=p.payment_method,
                transaction_reference=p.transaction_reference,
                notes=p.notes,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
            for p in (salary.payments or [])
        ]

        return SalaryResponse(
            id=salary.id,
            labour_id=salary.labour_id,
            labour_name=labour_obj.name if labour_obj else None,
            farm_id=salary.farm_id,
            farm_name=farm_obj.name if farm_obj else None,
            period_start=salary.period_start,
            period_end=salary.period_end,
            daily_wage_snapshot=salary.daily_wage_snapshot,
            present_days=salary.present_days,
            half_days=salary.half_days,
            absent_days=salary.absent_days,
            leave_days=salary.leave_days,
            payable_units=salary.payable_units,
            regular_salary=salary.regular_salary,
            overtime_pay=salary.overtime_pay,
            additional_earnings=salary.additional_earnings,
            deductions=salary.deductions,
            gross_salary=salary.gross_salary,
            net_salary=salary.net_salary,
            amount_paid=salary.amount_paid,
            outstanding_balance=salary.outstanding_balance,
            status=salary.status,
            notes=salary.notes,
            calculation_metadata=salary.calculation_metadata,
            payments=payments_list,
            created_at=salary.created_at,
            updated_at=salary.updated_at,
        )

    @staticmethod
    def list_salaries(
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        labour_id: Optional[UUID] = None,
        status_filter: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        search: Optional[str] = None,
    ) -> List[SalaryResponse]:
        """List salary records with filtering and verified tenant access."""
        query = (
            db.query(SalaryRecord, Labour, Farm)
            .join(Labour, SalaryRecord.labour_id == Labour.id)
            .join(Farm, SalaryRecord.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )

        if farm_id:
            query = query.filter(SalaryRecord.farm_id == farm_id)

        if labour_id:
            query = query.filter(SalaryRecord.labour_id == labour_id)

        if status_filter:
            clean_status = status_filter.strip().lower()
            query = query.filter(SalaryRecord.status == clean_status)

        if start_date:
            query = query.filter(SalaryRecord.period_start >= start_date)

        if end_date:
            query = query.filter(SalaryRecord.period_end <= end_date)

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
            desc(SalaryRecord.period_start),
            desc(SalaryRecord.created_at),
        )

        results = query.all()
        return [SalaryService._to_salary_response(sal, lab, farm) for sal, lab, farm in results]

    @staticmethod
    def get_salary_by_id(db: Session, user_id: UUID, salary_id: UUID) -> SalaryResponse:
        """Fetch a specific salary record by ID with verified tenant access."""
        result = (
            db.query(SalaryRecord, Labour, Farm)
            .join(Labour, SalaryRecord.labour_id == Labour.id)
            .join(Farm, SalaryRecord.farm_id == Farm.id)
            .filter(SalaryRecord.id == salary_id, Farm.user_id == user_id)
            .first()
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Salary record not found or access unauthorized",
            )
        salary, labour, farm = result
        return SalaryService._to_salary_response(salary, labour, farm)

    @staticmethod
    def update_salary(
        db: Session, user_id: UUID, salary_id: UUID, update_in: SalaryUpdate
    ) -> SalaryResponse:
        """
        Update adjustable earnings/deductions/notes on an existing salary record.
        Safely recomputes net totals and prevents reducing net salary below disbursed amount.
        """
        result = (
            db.query(SalaryRecord, Labour, Farm)
            .join(Labour, SalaryRecord.labour_id == Labour.id)
            .join(Farm, SalaryRecord.farm_id == Farm.id)
            .filter(SalaryRecord.id == salary_id, Farm.user_id == user_id)
            .first()
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Salary record not found or access unauthorized",
            )
        salary, labour, farm = result

        if update_in.approved_overtime_pay is not None:
            salary.overtime_pay = update_in.approved_overtime_pay.quantize(Decimal("0.01"))

        if update_in.additional_earnings is not None:
            salary.additional_earnings = update_in.additional_earnings.quantize(Decimal("0.01"))

        if update_in.deductions is not None:
            salary.deductions = update_in.deductions.quantize(Decimal("0.01"))

        if update_in.notes is not None:
            salary.notes = update_in.notes

        # Recompute totals
        salary.gross_salary = (
            salary.regular_salary + salary.overtime_pay + salary.additional_earnings
        ).quantize(Decimal("0.01"))

        new_net = max(Decimal("0.00"), salary.gross_salary - salary.deductions).quantize(Decimal("0.01"))

        if new_net < salary.amount_paid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Adjusted net salary (₹{new_net}) cannot be less than already disbursed amount (₹{salary.amount_paid}).",
            )

        salary.net_salary = new_net
        salary.outstanding_balance = (salary.net_salary - salary.amount_paid).quantize(Decimal("0.01"))

        if salary.outstanding_balance == Decimal("0.00"):
            salary.status = "paid"
        elif salary.amount_paid > Decimal("0.00"):
            salary.status = "partially_paid"
        else:
            salary.status = "generated"

        db.commit()
        db.refresh(salary)
        return SalaryService._to_salary_response(salary, labour, farm)

    @staticmethod
    def delete_salary(db: Session, user_id: UUID, salary_id: UUID) -> SalaryDeleteResponse:
        """
        Safely deletes a salary record if no payments have been recorded.
        Protects financial audit trail from accidental loss.
        """
        result = (
            db.query(SalaryRecord)
            .join(Farm, SalaryRecord.farm_id == Farm.id)
            .filter(SalaryRecord.id == salary_id, Farm.user_id == user_id)
            .first()
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Salary record not found or access unauthorized",
            )

        if result.amount_paid > Decimal("0.00") or (result.payments and len(result.payments) > 0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete a salary record with recorded payments. Historical payment audit logs must be preserved.",
            )

        db.delete(result)
        db.commit()
        return SalaryDeleteResponse(
            id=salary_id,
            deleted=True,
            message="Salary record deleted successfully",
        )

    @staticmethod
    def record_payment(
        db: Session, user_id: UUID, salary_id: UUID, payment_in: PaymentCreate
    ) -> PaymentResponse:
        """
        Atomically records a wage disbursement and recalculates salary status in a database transaction.
        Enforces:
        - Tenant authorization
        - Payment amount > 0
        - Payment amount <= outstanding balance
        - Concurrent-safe ledger updates
        """
        result = (
            db.query(SalaryRecord)
            .join(Farm, SalaryRecord.farm_id == Farm.id)
            .filter(SalaryRecord.id == salary_id, Farm.user_id == user_id)
            .with_for_update()
            .first()
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Salary record not found or access unauthorized",
            )

        payment_amount = payment_in.amount.quantize(Decimal("0.01"))

        if payment_amount <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount must be greater than zero.",
            )

        if payment_amount > result.outstanding_balance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment amount (₹{payment_amount}) exceeds the remaining balance (₹{result.outstanding_balance}). Overpayment is not permitted.",
            )

        new_payment = SalaryPayment(
            salary_record_id=result.id,
            amount=payment_amount,
            payment_date=payment_in.payment_date,
            payment_method=payment_in.payment_method,
            transaction_reference=payment_in.transaction_reference,
            notes=payment_in.notes,
        )

        db.add(new_payment)

        # Update ledger on SalaryRecord
        result.amount_paid = (result.amount_paid + payment_amount).quantize(Decimal("0.01"))
        result.outstanding_balance = (result.net_salary - result.amount_paid).quantize(Decimal("0.01"))

        if result.outstanding_balance == Decimal("0.00"):
            result.status = "paid"
        else:
            result.status = "partially_paid"

        db.commit()
        db.refresh(new_payment)
        db.refresh(result)

        return PaymentResponse(
            id=new_payment.id,
            salary_record_id=new_payment.salary_record_id,
            amount=new_payment.amount,
            payment_date=new_payment.payment_date,
            payment_method=new_payment.payment_method,
            transaction_reference=new_payment.transaction_reference,
            notes=new_payment.notes,
            created_at=new_payment.created_at,
            updated_at=new_payment.updated_at,
        )

    @staticmethod
    def list_payments(
        db: Session, user_id: UUID, salary_id: UUID
    ) -> List[PaymentResponse]:
        """List payment history for a specific salary record."""
        salary = (
            db.query(SalaryRecord)
            .join(Farm, SalaryRecord.farm_id == Farm.id)
            .filter(SalaryRecord.id == salary_id, Farm.user_id == user_id)
            .first()
        )
        if not salary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Salary record not found or access unauthorized",
            )

        payments = (
            db.query(SalaryPayment)
            .filter(SalaryPayment.salary_record_id == salary_id)
            .order_by(desc(SalaryPayment.payment_date), desc(SalaryPayment.created_at))
            .all()
        )

        return [
            PaymentResponse(
                id=p.id,
                salary_record_id=p.salary_record_id,
                amount=p.amount,
                payment_date=p.payment_date,
                payment_method=p.payment_method,
                transaction_reference=p.transaction_reference,
                notes=p.notes,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
            for p in payments
        ]

    @staticmethod
    def get_payment_by_id(
        db: Session, user_id: UUID, salary_id: UUID, payment_id: UUID
    ) -> PaymentResponse:
        """Fetch a single payment item by ID with tenant verification."""
        payment = (
            db.query(SalaryPayment)
            .join(SalaryRecord, SalaryPayment.salary_record_id == SalaryRecord.id)
            .join(Farm, SalaryRecord.farm_id == Farm.id)
            .filter(
                SalaryPayment.id == payment_id,
                SalaryPayment.salary_record_id == salary_id,
                Farm.user_id == user_id,
            )
            .first()
        )
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment record not found or access unauthorized",
            )

        return PaymentResponse(
            id=payment.id,
            salary_record_id=payment.salary_record_id,
            amount=payment.amount,
            payment_date=payment.payment_date,
            payment_method=payment.payment_method,
            transaction_reference=payment.transaction_reference,
            notes=payment.notes,
            created_at=payment.created_at,
            updated_at=payment.updated_at,
        )

    @staticmethod
    def get_salary_summary(
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> SalarySummaryResponse:
        """Aggregate financial stats across salary records owned by user."""
        query = (
            db.query(SalaryRecord)
            .join(Farm, SalaryRecord.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )

        if farm_id:
            query = query.filter(SalaryRecord.farm_id == farm_id)
        if start_date:
            query = query.filter(SalaryRecord.period_start >= start_date)
        if end_date:
            query = query.filter(SalaryRecord.period_end <= end_date)

        records: List[SalaryRecord] = query.all()

        total_payable = sum((r.net_salary for r in records), Decimal("0.00"))
        total_paid = sum((r.amount_paid for r in records), Decimal("0.00"))
        total_balance = sum((r.outstanding_balance for r in records), Decimal("0.00"))

        paid_count = sum(1 for r in records if r.status == "paid")
        partially_paid_count = sum(1 for r in records if r.status == "partially_paid")
        unpaid_count = sum(
            1 for r in records if r.status in ("draft", "generated") and r.amount_paid == Decimal("0.00")
        )

        return SalarySummaryResponse(
            total_salary_payable=total_payable.quantize(Decimal("0.01")),
            total_amount_paid=total_paid.quantize(Decimal("0.01")),
            total_outstanding_balance=total_balance.quantize(Decimal("0.01")),
            paid_records_count=paid_count,
            partially_paid_records_count=partially_paid_count,
            unpaid_records_count=unpaid_count,
            total_records_count=len(records),
        )
