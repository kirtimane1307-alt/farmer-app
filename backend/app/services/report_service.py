"""Authoritative Reports Service for Phase 18: Reports Management.

Implements backend aggregation, decimal-safe financial calculations, multi-tenant isolation,
date-boundary resolution, and structured data generation for all 12 report categories.
"""

from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import Session

from app.models.farm import Farm
from app.models.field import Field
from app.models.crop import Crop
from app.models.labour import Labour
from app.models.attendance import Attendance
from app.models.salary import SalaryRecord, SalaryPayment
from app.models.application import AgriculturalApplication
from app.models.expense import Expense, ExpensePayment, EXPENSE_CATEGORY_LABELS
from app.models.equipment import Equipment, EquipmentMaintenance
from app.models.harvest import Harvest
from app.models.sale import Sale, SalePayment
from app.models.income import OtherIncome, INCOME_CATEGORY_LABELS
from app.models.calendar import FarmCalendarEvent

from app.schemas.report import (
    ReportCategory,
    DateRangePreset,
    ReportingPeriod,
    ReportMetadata,
    ReportsOverviewResponse,
    FarmSummaryReportData,
    FarmSummaryItem,
    FarmFieldDetail,
    CropReportData,
    CropReportItem,
    LabourReportData,
    LabourReportItem,
    AttendanceReportData,
    AttendanceReportItem,
    SalaryReportData,
    SalaryReportItem,
    FertilizerPesticideReportData,
    FertilizerPesticideReportItem,
    IrrigationReportData,
    IrrigationReportItem,
    ExpenseReportData,
    ExpenseReportItem,
    ExpenseCategorySummary,
    MachineryReportData,
    MachineryReportItem,
    HarvestReportData,
    HarvestReportItem,
    SalesIncomeReportData,
    SalesIncomeReportItem,
    FinancialSummaryReportData,
    MonthlyFinancialSummaryItem,
    UnifiedReportResponse,
)


class ReportService:
    """Core reporting engine enforcing security, calculation integrity, and multi-tenant isolation."""

    @staticmethod
    def resolve_date_range(
        preset: Optional[str] = None,
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None,
    ) -> ReportingPeriod:
        """Resolve reporting period boundaries based on preset or custom dates."""
        today = date.today()

        if preset == DateRangePreset.TODAY or preset == "today":
            start_d = today
            end_d = today
            label = f"Today ({today.strftime('%b %d, %Y')})"
        elif preset == DateRangePreset.LAST_7_DAYS or preset == "last_7_days":
            start_d = today - timedelta(days=6)
            end_d = today
            label = f"Last 7 Days ({start_d.strftime('%b %d')} - {end_d.strftime('%b %d, %Y')})"
        elif preset == DateRangePreset.LAST_30_DAYS or preset == "last_30_days":
            start_d = today - timedelta(days=29)
            end_d = today
            label = f"Last 30 Days ({start_d.strftime('%b %d')} - {end_d.strftime('%b %d, %Y')})"
        elif preset == DateRangePreset.THIS_MONTH or preset == "this_month":
            start_d = date(today.year, today.month, 1)
            # Find last day of current month
            if today.month == 12:
                end_d = date(today.year, 12, 31)
            else:
                next_month = date(today.year, today.month + 1, 1)
                end_d = next_month - timedelta(days=1)
            label = f"This Month ({today.strftime('%B %Y')})"
        elif preset == DateRangePreset.PREVIOUS_MONTH or preset == "previous_month":
            if today.month == 1:
                start_d = date(today.year - 1, 12, 1)
                end_d = date(today.year - 1, 12, 31)
            else:
                start_d = date(today.year, today.month - 1, 1)
                first_of_this_month = date(today.year, today.month, 1)
                end_d = first_of_this_month - timedelta(days=1)
            label = f"Previous Month ({start_d.strftime('%B %Y')})"
        elif preset == DateRangePreset.THIS_YEAR or preset == "this_year":
            start_d = date(today.year, 1, 1)
            end_d = date(today.year, 12, 31)
            label = f"This Year ({today.year})"
        elif custom_start or custom_end:
            start_d = custom_start
            end_d = custom_end
            if start_d and end_d:
                label = f"Custom Period ({start_d.strftime('%b %d, %Y')} - {end_d.strftime('%b %d, %Y')})"
            elif start_d:
                label = f"From {start_d.strftime('%b %d, %Y')}"
            else:
                label = f"Until {end_d.strftime('%b %d, %Y')}"
        else:
            # Default to All Time if no filter specified
            start_d = None
            end_d = None
            label = "All Time (Complete History)"

        if start_d and end_d and start_d > end_d:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Start date ({start_d}) cannot be later than end date ({end_d}).",
            )

        return ReportingPeriod(
            label=label,
            start_date=start_d,
            end_date=end_d,
            preset=preset or "custom",
        )

    @staticmethod
    def _resolve_owned_farms(
        db: Session, user_id: UUID, farm_id: Optional[UUID] = None
    ) -> Tuple[List[UUID], str]:
        """Verify farm ownership and return matching farm IDs with display name."""
        if farm_id:
            farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == user_id).first()
            if not farm:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Target farm not found or access unauthorized for this account.",
                )
            return [farm.id], farm.name

        farms = db.query(Farm).filter(Farm.user_id == user_id).all()
        farm_ids = [f.id for f in farms]
        farm_name = "All Registered Farms" if len(farms) > 1 else (farms[0].name if farms else "No Farms Registered")
        return farm_ids, farm_name

    # =========================================================================
    # High-Level Overview Dashboard
    # =========================================================================

    @classmethod
    def get_overview(cls, db: Session, user_id: UUID) -> ReportsOverviewResponse:
        """Compute top-level summary metrics across all reports for the user."""
        farm_ids, _ = cls._resolve_owned_farms(db, user_id)
        if not farm_ids:
            return ReportsOverviewResponse(
                total_categories=12,
                available_farms_count=0,
                total_fields_count=0,
                active_crops_count=0,
                total_labour_count=0,
                total_sales_revenue=Decimal("0.00"),
                total_other_income=Decimal("0.00"),
                total_income=Decimal("0.00"),
                total_expenses=Decimal("0.00"),
                recorded_profit_loss=Decimal("0.00"),
                is_profit=True,
                profit_margin_percentage=Decimal("0.00"),
            )

        farms_count = len(farm_ids)
        fields_count = db.query(Field).filter(Field.farm_id.in_(farm_ids)).count()
        active_crops = (
            db.query(Crop)
            .join(Field, Crop.field_id == Field.id)
            .filter(Field.farm_id.in_(farm_ids), Crop.status.in_(["growing", "ready_to_harvest"]))
            .count()
        )
        labour_count = db.query(Labour).filter(Labour.farm_id.in_(farm_ids)).count()

        # Sales Revenue (final amount after discount)
        sales = db.query(Sale).filter(Sale.farm_id.in_(farm_ids)).all()
        sales_rev = sum((s.total_amount for s in sales), Decimal("0.00")).quantize(Decimal("0.01"))

        # Other Income
        incomes = db.query(OtherIncome).filter(OtherIncome.farm_id.in_(farm_ids)).all()
        other_inc = sum((i.amount for i in incomes), Decimal("0.00")).quantize(Decimal("0.01"))

        # Gross Income
        gross_inc = (sales_rev + other_inc).quantize(Decimal("0.01"))

        # Expenses
        expenses = db.query(Expense).filter(Expense.farm_id.in_(farm_ids)).all()
        tot_exp = sum((e.amount for e in expenses), Decimal("0.00")).quantize(Decimal("0.01"))

        # Profit / Loss
        p_l = (gross_inc - tot_exp).quantize(Decimal("0.01"))
        is_p = p_l >= Decimal("0.00")
        margin = Decimal("0.00")
        if gross_inc > Decimal("0.00"):
            margin = ((p_l / gross_inc) * Decimal("100.00")).quantize(Decimal("0.01"))

        return ReportsOverviewResponse(
            total_categories=12,
            available_farms_count=farms_count,
            total_fields_count=fields_count,
            active_crops_count=active_crops,
            total_labour_count=labour_count,
            total_sales_revenue=sales_rev,
            total_other_income=other_inc,
            total_income=gross_inc,
            total_expenses=tot_exp,
            recorded_profit_loss=p_l,
            is_profit=is_p,
            profit_margin_percentage=margin,
        )

    # =========================================================================
    # 1. Farm Summary Report
    # =========================================================================

    @classmethod
    def get_farm_summary_report(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        period: Optional[ReportingPeriod] = None,
    ) -> FarmSummaryReportData:
        """Generate comprehensive summary report across user's farms and field plots."""
        period = period or cls.resolve_date_range()
        farm_ids, farm_name = cls._resolve_owned_farms(db, user_id, farm_id)

        farms = db.query(Farm).filter(Farm.id.in_(farm_ids)).order_by(Farm.name).all()
        items: List[FarmSummaryItem] = []

        total_land_area = Decimal("0.00")
        total_fields_all = 0
        total_active_crops_all = 0

        for f in farms:
            total_land_area += Decimal(str(f.total_area))
            fields = db.query(Field).filter(Field.farm_id == f.id).order_by(Field.name).all()
            total_fields_all += len(fields)

            cultivated = Decimal("0.00")
            field_details: List[FarmFieldDetail] = []
            farm_crops_list: List[str] = []

            for fld in fields:
                cultivated += Decimal(str(fld.area))
                crops = (
                    db.query(Crop)
                    .filter(Crop.field_id == fld.id, Crop.status.in_(["growing", "ready_to_harvest"]))
                    .all()
                )
                crop_names = [f"{c.name} ({c.variety})" for c in crops]
                farm_crops_list.extend(crop_names)

                field_details.append(
                    FarmFieldDetail(
                        id=fld.id,
                        name=fld.name,
                        area=Decimal(str(fld.area)),
                        area_unit=fld.area_unit,
                        soil_type=fld.soil_type,
                        irrigation_type=fld.irrigation_type,
                        active_crops_count=len(crops),
                        active_crops_names=crop_names,
                    )
                )

            workers_count = db.query(Labour).filter(Labour.farm_id == f.id).count()

            # Activity count in period
            activity_q = db.query(FarmCalendarEvent).filter(FarmCalendarEvent.farm_id == f.id)
            if period.start_date:
                activity_q = activity_q.filter(FarmCalendarEvent.start_datetime >= datetime.combine(period.start_date, datetime.min.time()))
            if period.end_date:
                activity_q = activity_q.filter(FarmCalendarEvent.start_datetime <= datetime.combine(period.end_date, datetime.max.time()))
            activity_count = activity_q.count()

            items.append(
                FarmSummaryItem(
                    farm_id=f.id,
                    farm_name=f.name,
                    location=f.location,
                    total_area=Decimal(str(f.total_area)),
                    area_unit=f.area_unit,
                    total_fields=len(fields),
                    cultivated_area=cultivated.quantize(Decimal("0.01")),
                    active_crops_count=len(farm_crops_list),
                    active_crops=list(set(farm_crops_list)),
                    total_workers=workers_count,
                    total_activities_count=activity_count,
                    fields=field_details,
                )
            )
            total_active_crops_all += len(farm_crops_list)

        metadata = ReportMetadata(
            report_category=ReportCategory.FARM_SUMMARY.value,
            report_title="Farm Summary Report",
            farm_id=farm_id,
            farm_name=farm_name,
            period=period,
            total_records=len(items),
        )

        return FarmSummaryReportData(
            metadata=metadata,
            farms=items,
            summary={
                "total_farms": len(farms),
                "total_area": float(total_land_area.quantize(Decimal("0.01"))),
                "total_fields": total_fields_all,
                "total_active_crops": total_active_crops_all,
            },
        )

    # =========================================================================
    # 2. Crop Report
    # =========================================================================

    @classmethod
    def get_crop_report(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        crop_status: Optional[str] = None,
        period: Optional[ReportingPeriod] = None,
    ) -> CropReportData:
        """Generate comprehensive crop cycle performance and harvest status report."""
        period = period or cls.resolve_date_range()
        farm_ids, farm_name = cls._resolve_owned_farms(db, user_id, farm_id)

        query = (
            db.query(Crop, Field, Farm)
            .join(Field, Crop.field_id == Field.id)
            .join(Farm, Field.farm_id == Farm.id)
            .filter(Farm.id.in_(farm_ids))
        )

        if field_id:
            query = query.filter(Field.id == field_id)
        if crop_status:
            query = query.filter(Crop.status == crop_status)
        if period.start_date:
            query = query.filter(Crop.sowing_date >= period.start_date)
        if period.end_date:
            query = query.filter(Crop.sowing_date <= period.end_date)

        records = query.order_by(desc(Crop.sowing_date)).all()
        items: List[CropReportItem] = []
        tot_area = Decimal("0.00")
        active_cnt = 0
        harvested_cnt = 0
        status_map: Dict[str, int] = defaultdict(int)

        for crop, fld, frm in records:
            status_map[crop.status] += 1
            if crop.status in ("growing", "ready_to_harvest"):
                active_cnt += 1
            elif crop.status == "harvested":
                harvested_cnt += 1

            c_area = Decimal(str(crop.planted_area)) if crop.planted_area else Decimal("0.00")
            tot_area += c_area

            # Find actual harvest yield if recorded
            harvest_rec = (
                db.query(Harvest)
                .filter(Harvest.crop_id == crop.id)
                .order_by(desc(Harvest.harvest_date))
                .first()
            )

            items.append(
                CropReportItem(
                    crop_id=crop.id,
                    crop_name=crop.name,
                    variety=crop.variety,
                    season=crop.season,
                    farm_id=frm.id,
                    farm_name=frm.name,
                    field_id=fld.id,
                    field_name=fld.name,
                    sowing_date=crop.sowing_date,
                    expected_harvest_date=crop.expected_harvest_date,
                    actual_harvest_date=crop.actual_harvest_date or (harvest_rec.harvest_date if harvest_rec else None),
                    status=crop.status,
                    planted_area=c_area.quantize(Decimal("0.01")),
                    planted_area_unit=crop.planted_area_unit or "acres",
                    seed_quantity=Decimal(str(crop.seed_quantity)) if crop.seed_quantity else None,
                    seed_unit=crop.seed_unit,
                    harvest_yield=Decimal(str(harvest_rec.quantity)) if harvest_rec else None,
                    harvest_unit=harvest_rec.unit if harvest_rec else None,
                    notes=crop.notes,
                )
            )

        metadata = ReportMetadata(
            report_category=ReportCategory.CROP.value,
            report_title="Crop Cultivation & Harvest Report",
            farm_id=farm_id,
            farm_name=farm_name,
            period=period,
            total_records=len(items),
        )

        return CropReportData(
            metadata=metadata,
            items=items,
            total_crops=len(items),
            total_planted_area=tot_area.quantize(Decimal("0.01")),
            active_crops_count=active_cnt,
            harvested_crops_count=harvested_cnt,
            status_breakdown=dict(status_map),
        )

    # =========================================================================
    # 3. Labour Report
    # =========================================================================

    @classmethod
    def get_labour_report(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        labour_id: Optional[UUID] = None,
        worker_status: Optional[str] = None,
        period: Optional[ReportingPeriod] = None,
    ) -> LabourReportData:
        """Generate workforce summary report detailing work history, attendance, and wages."""
        period = period or cls.resolve_date_range()
        farm_ids, farm_name = cls._resolve_owned_farms(db, user_id, farm_id)

        query = db.query(Labour, Farm).join(Farm, Labour.farm_id == Farm.id).filter(Farm.id.in_(farm_ids))
        if labour_id:
            query = query.filter(Labour.id == labour_id)
        if worker_status:
            query = query.filter(Labour.status == worker_status)

        workers = query.order_by(Labour.name).all()
        items: List[LabourReportItem] = []

        tot_earned = Decimal("0.00")
        tot_paid = Decimal("0.00")
        tot_outstanding = Decimal("0.00")
        active_cnt = 0

        for worker, frm in workers:
            if worker.status == "active":
                active_cnt += 1

            # Attendance within period
            att_q = db.query(Attendance).filter(Attendance.labour_id == worker.id)
            if period.start_date:
                att_q = att_q.filter(Attendance.attendance_date >= period.start_date)
            if period.end_date:
                att_q = att_q.filter(Attendance.attendance_date <= period.end_date)
            attendances = att_q.all()

            pres_cnt = sum(1 for a in attendances if a.status == "present")
            abs_cnt = sum(1 for a in attendances if a.status == "absent")
            half_cnt = sum(1 for a in attendances if a.status == "half_day")
            leave_cnt = sum(1 for a in attendances if a.status == "leave")
            tot_days = len(attendances)

            tot_mins = sum(a.working_minutes for a in attendances)
            tot_hours = (Decimal(str(tot_mins)) / Decimal("60.00")).quantize(Decimal("0.01"))

            att_rate = Decimal("0.00")
            if tot_days > 0:
                weighted_present = Decimal(str(pres_cnt)) + (Decimal(str(half_cnt)) * Decimal("0.5"))
                att_rate = ((weighted_present / Decimal(str(tot_days))) * Decimal("100.00")).quantize(Decimal("0.01"))

            # Salary records
            sal_q = db.query(SalaryRecord).filter(SalaryRecord.labour_id == worker.id)
            if period.start_date:
                sal_q = sal_q.filter(SalaryRecord.period_start >= period.start_date)
            if period.end_date:
                sal_q = sal_q.filter(SalaryRecord.period_end <= period.end_date)
            sal_records = sal_q.all()

            w_earned = sum((s.net_salary for s in sal_records), Decimal("0.00")).quantize(Decimal("0.01"))
            w_paid = sum((s.amount_paid for s in sal_records), Decimal("0.00")).quantize(Decimal("0.01"))
            w_out = (w_earned - w_paid).quantize(Decimal("0.01"))

            tot_earned += w_earned
            tot_paid += w_paid
            tot_outstanding += w_out

            items.append(
                LabourReportItem(
                    labour_id=worker.id,
                    name=worker.name,
                    phone=worker.phone,
                    work_type=worker.work_type,
                    daily_wage=Decimal(str(worker.daily_wage)).quantize(Decimal("0.01")),
                    joining_date=worker.joining_date,
                    status=worker.status,
                    farm_id=frm.id,
                    farm_name=frm.name,
                    total_working_days=pres_cnt + half_cnt,
                    total_working_hours=tot_hours,
                    present_days=pres_cnt,
                    absent_days=abs_cnt,
                    half_days=half_cnt,
                    leave_days=leave_cnt,
                    attendance_rate=att_rate,
                    total_salary_earned=w_earned,
                    total_salary_paid=w_paid,
                    outstanding_balance=w_out,
                )
            )

        metadata = ReportMetadata(
            report_category=ReportCategory.LABOUR.value,
            report_title="Labour & Workforce Report",
            farm_id=farm_id,
            farm_name=farm_name,
            period=period,
            total_records=len(items),
        )

        return LabourReportData(
            metadata=metadata,
            items=items,
            total_workers=len(items),
            active_workers=active_cnt,
            total_wages_earned=tot_earned,
            total_wages_paid=tot_paid,
            total_wages_outstanding=tot_outstanding,
        )

    # =========================================================================
    # 4. Attendance Report
    # =========================================================================

    @classmethod
    def get_attendance_report(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        labour_id: Optional[UUID] = None,
        status_filter: Optional[str] = None,
        period: Optional[ReportingPeriod] = None,
    ) -> AttendanceReportData:
        """Generate verified attendance report without fabricating presence metrics."""
        period = period or cls.resolve_date_range()
        farm_ids, farm_name = cls._resolve_owned_farms(db, user_id, farm_id)

        query = (
            db.query(Attendance, Labour, Farm)
            .join(Labour, Attendance.labour_id == Labour.id)
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(Farm.id.in_(farm_ids))
        )

        if labour_id:
            query = query.filter(Labour.id == labour_id)
        if status_filter:
            query = query.filter(Attendance.status == status_filter)
        if period.start_date:
            query = query.filter(Attendance.attendance_date >= period.start_date)
        if period.end_date:
            query = query.filter(Attendance.attendance_date <= period.end_date)

        records = query.order_by(desc(Attendance.attendance_date), Labour.name).all()
        items: List[AttendanceReportItem] = []

        pres_cnt = 0
        abs_cnt = 0
        half_cnt = 0
        leave_cnt = 0
        tot_mins = 0

        for att, worker, frm in records:
            if att.status == "present":
                pres_cnt += 1
            elif att.status == "absent":
                abs_cnt += 1
            elif att.status == "half_day":
                half_cnt += 1
            elif att.status == "leave":
                leave_cnt += 1

            tot_mins += att.working_minutes
            hrs = (Decimal(str(att.working_minutes)) / Decimal("60.00")).quantize(Decimal("0.01"))

            items.append(
                AttendanceReportItem(
                    attendance_id=att.id,
                    labour_id=worker.id,
                    worker_name=worker.name,
                    farm_id=frm.id,
                    farm_name=frm.name,
                    work_type=worker.work_type,
                    attendance_date=att.attendance_date,
                    status=att.status,
                    check_in=att.check_in.strftime("%H:%M") if att.check_in else None,
                    check_out=att.check_out.strftime("%H:%M") if att.check_out else None,
                    working_minutes=att.working_minutes,
                    working_hours=hrs,
                    overtime_minutes=att.overtime_minutes,
                    notes=att.notes,
                )
            )

        total_recs = len(items)
        rate = Decimal("0.00")
        if total_recs > 0:
            effective = Decimal(str(pres_cnt)) + (Decimal(str(half_cnt)) * Decimal("0.5"))
            rate = ((effective / Decimal(str(total_recs))) * Decimal("100.00")).quantize(Decimal("0.01"))

        tot_hrs = (Decimal(str(tot_mins)) / Decimal("60.00")).quantize(Decimal("0.01"))

        metadata = ReportMetadata(
            report_category=ReportCategory.ATTENDANCE.value,
            report_title="Workforce Attendance Report",
            farm_id=farm_id,
            farm_name=farm_name,
            period=period,
            total_records=total_recs,
        )

        return AttendanceReportData(
            metadata=metadata,
            items=items,
            total_records=total_recs,
            present_count=pres_cnt,
            absent_count=abs_cnt,
            half_day_count=half_cnt,
            leave_count=leave_cnt,
            overall_attendance_rate=rate,
            total_working_hours=tot_hrs,
        )

    # =========================================================================
    # 5. Salary and Payment Report
    # =========================================================================

    @classmethod
    def get_salary_report(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        labour_id: Optional[UUID] = None,
        payment_status: Optional[str] = None,
        period: Optional[ReportingPeriod] = None,
    ) -> SalaryReportData:
        """Generate verified salary ledger report enforcing: unpaid salary != payment."""
        period = period or cls.resolve_date_range()
        farm_ids, farm_name = cls._resolve_owned_farms(db, user_id, farm_id)

        query = (
            db.query(SalaryRecord, Labour, Farm)
            .join(Labour, SalaryRecord.labour_id == Labour.id)
            .join(Farm, SalaryRecord.farm_id == Farm.id)
            .filter(Farm.id.in_(farm_ids))
        )

        if labour_id:
            query = query.filter(Labour.id == labour_id)
        if payment_status:
            query = query.filter(SalaryRecord.status == payment_status)
        if period.start_date:
            query = query.filter(SalaryRecord.period_start >= period.start_date)
        if period.end_date:
            query = query.filter(SalaryRecord.period_end <= period.end_date)

        records = query.order_by(desc(SalaryRecord.period_start), Labour.name).all()
        items: List[SalaryReportItem] = []

        tot_earned = Decimal("0.00")
        tot_paid = Decimal("0.00")
        tot_out = Decimal("0.00")
        paid_cnt = 0
        pending_cnt = 0

        for sal, worker, frm in records:
            tot_earned += sal.net_salary
            tot_paid += sal.amount_paid
            # Explicitly compute outstanding: Net Salary - Amount Paid
            out_balance = (sal.net_salary - sal.amount_paid).quantize(Decimal("0.01"))
            tot_out += out_balance

            if sal.status == "paid":
                paid_cnt += 1
            else:
                pending_cnt += 1

            # Find latest payment date if any
            last_pmt = (
                db.query(SalaryPayment)
                .filter(SalaryPayment.salary_record_id == sal.id)
                .order_by(desc(SalaryPayment.payment_date))
                .first()
            )

            items.append(
                SalaryReportItem(
                    salary_record_id=sal.id,
                    labour_id=worker.id,
                    worker_name=worker.name,
                    farm_id=frm.id,
                    farm_name=frm.name,
                    period_start=sal.period_start,
                    period_end=sal.period_end,
                    daily_wage_snapshot=sal.daily_wage_snapshot,
                    present_days=sal.present_days,
                    half_days=sal.half_days,
                    absent_days=sal.absent_days,
                    gross_salary=sal.gross_salary,
                    deductions=sal.deductions,
                    net_salary=sal.net_salary,
                    amount_paid=sal.amount_paid,
                    outstanding_balance=out_balance,
                    status=sal.status,
                    last_payment_date=last_pmt.payment_date if last_pmt else None,
                    notes=sal.notes,
                )
            )

        metadata = ReportMetadata(
            report_category=ReportCategory.SALARY.value,
            report_title="Salary & Wage Payment Report",
            farm_id=farm_id,
            farm_name=farm_name,
            period=period,
            total_records=len(items),
        )

        return SalaryReportData(
            metadata=metadata,
            items=items,
            total_salary_earned=tot_earned.quantize(Decimal("0.01")),
            total_amount_paid=tot_paid.quantize(Decimal("0.01")),
            total_outstanding_amount=tot_out.quantize(Decimal("0.01")),
            paid_records_count=paid_cnt,
            pending_records_count=pending_cnt,
        )

    # =========================================================================
    # 6. Fertilizer and Pesticide Report
    # =========================================================================

    @classmethod
    def get_fertilizer_pesticide_report(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        crop_id: Optional[UUID] = None,
        category: Optional[str] = None,
        period: Optional[ReportingPeriod] = None,
    ) -> FertilizerPesticideReportData:
        """Generate agrochemical input report tracking fertilizers, pesticides, and costs."""
        period = period or cls.resolve_date_range()
        farm_ids, farm_name = cls._resolve_owned_farms(db, user_id, farm_id)

        query = (
            db.query(AgriculturalApplication, Farm, Field)
            .join(Farm, AgriculturalApplication.farm_id == Farm.id)
            .join(Field, AgriculturalApplication.field_id == Field.id)
            .filter(Farm.id.in_(farm_ids))
        )

        if field_id:
            query = query.filter(AgriculturalApplication.field_id == field_id)
        if crop_id:
            query = query.filter(AgriculturalApplication.crop_id == crop_id)
        if category:
            query = query.filter(AgriculturalApplication.application_category == category)
        if period.start_date:
            query = query.filter(AgriculturalApplication.application_date >= period.start_date)
        if period.end_date:
            query = query.filter(AgriculturalApplication.application_date <= period.end_date)

        records = query.order_by(desc(AgriculturalApplication.application_date)).all()
        items: List[FertilizerPesticideReportItem] = []

        tot_exp = Decimal("0.00")
        fert_exp = Decimal("0.00")
        pest_exp = Decimal("0.00")
        fert_cnt = 0
        pest_cnt = 0

        for app, frm, fld in records:
            crop_name = None
            if app.crop_id:
                cr = db.query(Crop).filter(Crop.id == app.crop_id).first()
                if cr:
                    crop_name = f"{cr.name} ({cr.variety})"

            cost = Decimal(str(app.total_cost)) if app.total_cost else Decimal("0.00")
            tot_exp += cost

            if app.application_category == "fertilizer":
                fert_cnt += 1
                fert_exp += cost
            elif app.application_category == "pesticide":
                pest_cnt += 1
                pest_exp += cost

            items.append(
                FertilizerPesticideReportItem(
                    application_id=app.id,
                    product_name=app.product_name,
                    application_category=app.application_category,
                    product_type=app.product_type,
                    quantity=Decimal(str(app.quantity)),
                    unit=app.unit,
                    unit_cost=Decimal(str(app.unit_cost)) if app.unit_cost else None,
                    total_cost=cost if app.total_cost else None,
                    application_date=app.application_date,
                    application_method=app.application_method,
                    purpose=app.purpose,
                    farm_id=frm.id,
                    farm_name=frm.name,
                    field_id=fld.id,
                    field_name=fld.name,
                    crop_id=app.crop_id,
                    crop_name=crop_name,
                    notes=app.notes,
                )
            )

        metadata = ReportMetadata(
            report_category=ReportCategory.FERTILIZER_PESTICIDE.value,
            report_title="Fertilizer & Pesticide Application Report",
            farm_id=farm_id,
            farm_name=farm_name,
            period=period,
            total_records=len(items),
        )

        return FertilizerPesticideReportData(
            metadata=metadata,
            items=items,
            total_applications=len(items),
            fertilizer_applications_count=fert_cnt,
            pesticide_applications_count=pest_cnt,
            total_expenditure=tot_exp.quantize(Decimal("0.01")),
            fertilizer_expenditure=fert_exp.quantize(Decimal("0.01")),
            pesticide_expenditure=pest_exp.quantize(Decimal("0.01")),
        )

    # =========================================================================
    # 7. Irrigation Report
    # =========================================================================

    @classmethod
    def get_irrigation_report(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        period: Optional[ReportingPeriod] = None,
    ) -> IrrigationReportData:
        """Generate irrigation activity report queried from farm calendar events and field systems."""
        period = period or cls.resolve_date_range()
        farm_ids, farm_name = cls._resolve_owned_farms(db, user_id, farm_id)

        query = (
            db.query(FarmCalendarEvent, Farm)
            .join(Farm, FarmCalendarEvent.farm_id == Farm.id)
            .filter(Farm.id.in_(farm_ids))
            .filter(
                or_(
                    FarmCalendarEvent.activity_type == "irrigation",
                    FarmCalendarEvent.title.ilike("%irrigation%"),
                    FarmCalendarEvent.title.ilike("%watering%"),
                )
            )
        )

        if field_id:
            query = query.filter(FarmCalendarEvent.field_id == field_id)
        if period.start_date:
            query = query.filter(FarmCalendarEvent.start_datetime >= datetime.combine(period.start_date, datetime.min.time()))
        if period.end_date:
            query = query.filter(FarmCalendarEvent.start_datetime <= datetime.combine(period.end_date, datetime.max.time()))

        records = query.order_by(desc(FarmCalendarEvent.start_datetime)).all()
        items: List[IrrigationReportItem] = []

        total_mins = 0
        fields_set = set()

        for ev, frm in records:
            fld_name = None
            fld_method = "Standard Irrigation"
            if ev.field_id:
                fld = db.query(Field).filter(Field.id == ev.field_id).first()
                if fld:
                    fld_name = fld.name
                    fields_set.add(fld.id)
                    if fld.irrigation_type:
                        fld_method = fld.irrigation_type

            crop_name = None
            if ev.crop_id:
                cr = db.query(Crop).filter(Crop.id == ev.crop_id).first()
                if cr:
                    crop_name = cr.name

            # Compute duration if start & end datetime present
            dur_mins = None
            dur_hrs = None
            if ev.end_datetime and ev.start_datetime:
                diff = ev.end_datetime - ev.start_datetime
                dur_mins = int(diff.total_seconds() / 60)
                if dur_mins > 0:
                    total_mins += dur_mins
                    dur_hrs = (Decimal(str(dur_mins)) / Decimal("60.00")).quantize(Decimal("0.01"))

            items.append(
                IrrigationReportItem(
                    event_id=ev.id,
                    farm_id=frm.id,
                    farm_name=frm.name,
                    field_id=ev.field_id,
                    field_name=fld_name,
                    crop_id=ev.crop_id,
                    crop_name=crop_name,
                    irrigation_date=ev.start_datetime.date(),
                    irrigation_method=fld_method,
                    duration_minutes=dur_mins,
                    duration_hours=dur_hrs,
                    water_usage_litres=None,
                    status=ev.status,
                    notes=ev.notes or ev.description,
                )
            )

        tot_dur_hrs = (Decimal(str(total_mins)) / Decimal("60.00")).quantize(Decimal("0.01"))

        metadata = ReportMetadata(
            report_category=ReportCategory.IRRIGATION.value,
            report_title="Irrigation & Water Management Report",
            farm_id=farm_id,
            farm_name=farm_name,
            period=period,
            total_records=len(items),
        )

        return IrrigationReportData(
            metadata=metadata,
            items=items,
            total_irrigation_sessions=len(items),
            total_duration_hours=tot_dur_hrs,
            total_water_usage_litres=None,
            fields_covered_count=len(fields_set),
        )

    # =========================================================================
    # 8. Expense Report
    # =========================================================================

    @classmethod
    def get_expense_report(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        category: Optional[str] = None,
        payment_status: Optional[str] = None,
        period: Optional[ReportingPeriod] = None,
    ) -> ExpenseReportData:
        """Generate detailed farm expense report with category-wise breakdown."""
        period = period or cls.resolve_date_range()
        farm_ids, farm_name = cls._resolve_owned_farms(db, user_id, farm_id)

        query = (
            db.query(Expense, Farm)
            .join(Farm, Expense.farm_id == Farm.id)
            .filter(Farm.id.in_(farm_ids))
        )

        if field_id:
            query = query.filter(Expense.field_id == field_id)
        if category:
            query = query.filter(Expense.category == category)
        if payment_status:
            query = query.filter(Expense.payment_status == payment_status)
        if period.start_date:
            query = query.filter(Expense.expense_date >= period.start_date)
        if period.end_date:
            query = query.filter(Expense.expense_date <= period.end_date)

        records = query.order_by(desc(Expense.expense_date)).all()
        items: List[ExpenseReportItem] = []

        tot_amount = Decimal("0.00")
        tot_paid = Decimal("0.00")
        tot_outstanding = Decimal("0.00")
        cat_map: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"total": Decimal("0.00"), "count": 0})

        for exp, frm in records:
            fld_name = None
            if exp.field_id:
                fld = db.query(Field).filter(Field.id == exp.field_id).first()
                if fld:
                    fld_name = fld.name

            tot_amount += exp.amount
            tot_paid += exp.amount_paid
            tot_outstanding += exp.outstanding_balance

            cat_map[exp.category]["total"] += exp.amount
            cat_map[exp.category]["count"] += 1

            cat_lbl = EXPENSE_CATEGORY_LABELS.get(exp.category, exp.category.replace("_", " ").title())

            items.append(
                ExpenseReportItem(
                    expense_id=exp.id,
                    title=exp.title,
                    category=exp.category,
                    category_label=cat_lbl,
                    amount=exp.amount,
                    amount_paid=exp.amount_paid,
                    outstanding_balance=exp.outstanding_balance,
                    expense_date=exp.expense_date,
                    payment_status=exp.payment_status,
                    payment_method=exp.payment_method,
                    vendor_name=exp.vendor_name,
                    farm_id=frm.id,
                    farm_name=frm.name,
                    field_id=exp.field_id,
                    field_name=fld_name,
                    notes=exp.notes,
                )
            )

        # Build category summary breakdown
        summaries: List[ExpenseCategorySummary] = []
        for c_key, c_data in sorted(cat_map.items(), key=lambda x: x[1]["total"], reverse=True):
            pct = Decimal("0.00")
            if tot_amount > Decimal("0.00"):
                pct = ((c_data["total"] / tot_amount) * Decimal("100.00")).quantize(Decimal("0.01"))
            summaries.append(
                ExpenseCategorySummary(
                    category=c_key,
                    category_label=EXPENSE_CATEGORY_LABELS.get(c_key, c_key.replace("_", " ").title()),
                    total_amount=c_data["total"].quantize(Decimal("0.01")),
                    percentage=pct,
                    count=c_data["count"],
                )
            )

        metadata = ReportMetadata(
            report_category=ReportCategory.EXPENSE.value,
            report_title="Farm Operational Expense Report",
            farm_id=farm_id,
            farm_name=farm_name,
            period=period,
            total_records=len(items),
        )

        return ExpenseReportData(
            metadata=metadata,
            items=items,
            total_expenses=tot_amount.quantize(Decimal("0.01")),
            total_paid=tot_paid.quantize(Decimal("0.01")),
            total_outstanding=tot_outstanding.quantize(Decimal("0.01")),
            category_summaries=summaries,
        )

    # =========================================================================
    # 9. Machinery and Equipment Report
    # =========================================================================

    @classmethod
    def get_machinery_report(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        operational_status: Optional[str] = None,
        condition: Optional[str] = None,
        period: Optional[ReportingPeriod] = None,
    ) -> MachineryReportData:
        """Generate equipment registry and maintenance valuation report."""
        period = period or cls.resolve_date_range()
        farm_ids, farm_name = cls._resolve_owned_farms(db, user_id, farm_id)

        query = db.query(Equipment, Farm).join(Farm, Equipment.farm_id == Farm.id).filter(Farm.id.in_(farm_ids))
        if operational_status:
            query = query.filter(Equipment.operational_status == operational_status)
        if condition:
            query = query.filter(Equipment.condition == condition)

        records = query.order_by(Equipment.equipment_name).all()
        items: List[MachineryReportItem] = []

        tot_asset_val = Decimal("0.00")
        tot_maint_cost = Decimal("0.00")
        avail_cnt = 0
        maint_cnt = 0
        ret_cnt = 0

        for eq, frm in records:
            if eq.operational_status == "available":
                avail_cnt += 1
            elif eq.operational_status == "under_maintenance":
                maint_cnt += 1
            elif eq.operational_status == "retired":
                ret_cnt += 1

            if eq.purchase_price:
                tot_asset_val += eq.purchase_price

            fld_name = None
            if eq.field_id:
                fld = db.query(Field).filter(Field.id == eq.field_id).first()
                if fld:
                    fld_name = fld.name

            # Maintenance logs
            maints = db.query(EquipmentMaintenance).filter(EquipmentMaintenance.equipment_id == eq.id).all()
            m_cost = sum((m.cost for m in maints if m.cost), Decimal("0.00"))
            tot_maint_cost += m_cost

            items.append(
                MachineryReportItem(
                    equipment_id=eq.id,
                    equipment_name=eq.equipment_name,
                    equipment_type=eq.equipment_type,
                    brand=eq.brand,
                    model_number=eq.model_number,
                    serial_number=eq.serial_number,
                    purchase_date=eq.purchase_date,
                    purchase_price=eq.purchase_price,
                    operational_status=eq.operational_status,
                    condition=eq.condition,
                    fuel_type=eq.fuel_type,
                    farm_id=frm.id,
                    farm_name=frm.name,
                    field_id=eq.field_id,
                    field_name=fld_name,
                    last_service_date=eq.last_service_date,
                    next_service_date=eq.next_service_date,
                    maintenance_count=len(maints),
                    total_maintenance_cost=m_cost.quantize(Decimal("0.01")),
                    notes=eq.notes,
                )
            )

        metadata = ReportMetadata(
            report_category=ReportCategory.MACHINERY.value,
            report_title="Machinery & Equipment Asset Report",
            farm_id=farm_id,
            farm_name=farm_name,
            period=period,
            total_records=len(items),
        )

        return MachineryReportData(
            metadata=metadata,
            items=items,
            total_equipment=len(items),
            available_count=avail_cnt,
            under_maintenance_count=maint_cnt,
            retired_count=ret_cnt,
            total_asset_value=tot_asset_val.quantize(Decimal("0.01")),
            total_maintenance_expenditure=tot_maint_cost.quantize(Decimal("0.01")),
        )

    # =========================================================================
    # 10. Harvest Report
    # =========================================================================

    @classmethod
    def get_harvest_report(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        crop_id: Optional[UUID] = None,
        quality_grade: Optional[str] = None,
        period: Optional[ReportingPeriod] = None,
    ) -> HarvestReportData:
        """Generate yield output and harvest grading report."""
        period = period or cls.resolve_date_range()
        farm_ids, farm_name = cls._resolve_owned_farms(db, user_id, farm_id)

        query = (
            db.query(Harvest, Crop, Field, Farm)
            .join(Crop, Harvest.crop_id == Crop.id)
            .join(Field, Harvest.field_id == Field.id)
            .join(Farm, Harvest.farm_id == Farm.id)
            .filter(Farm.id.in_(farm_ids))
        )

        if field_id:
            query = query.filter(Harvest.field_id == field_id)
        if crop_id:
            query = query.filter(Harvest.crop_id == crop_id)
        if quality_grade:
            query = query.filter(Harvest.quality_grade == quality_grade)
        if period.start_date:
            query = query.filter(Harvest.harvest_date >= period.start_date)
        if period.end_date:
            query = query.filter(Harvest.harvest_date <= period.end_date)

        records = query.order_by(desc(Harvest.harvest_date)).all()
        items: List[HarvestReportItem] = []

        unit_yields: Dict[str, Decimal] = defaultdict(Decimal)
        grade_dist: Dict[str, int] = defaultdict(int)

        for h, cr, fld, frm in records:
            unit_yields[h.unit] += Decimal(str(h.quantity))
            grade_dist[h.quality_grade] += 1

            items.append(
                HarvestReportItem(
                    harvest_id=h.id,
                    crop_id=cr.id,
                    crop_name=cr.name,
                    variety=cr.variety,
                    farm_id=frm.id,
                    farm_name=frm.name,
                    field_id=fld.id,
                    field_name=fld.name,
                    harvest_date=h.harvest_date,
                    quantity=Decimal(str(h.quantity)),
                    unit=h.unit,
                    quality_grade=h.quality_grade,
                    harvest_method=h.harvest_method,
                    storage_location=h.storage_location,
                    batch_number=h.batch_number,
                    notes=h.notes,
                )
            )

        metadata = ReportMetadata(
            report_category=ReportCategory.HARVEST.value,
            report_title="Crop Harvest & Yield Report",
            farm_id=farm_id,
            farm_name=farm_name,
            period=period,
            total_records=len(items),
        )

        return HarvestReportData(
            metadata=metadata,
            items=items,
            total_harvests=len(items),
            total_yield_by_unit={u: val.quantize(Decimal("0.01")) for u, val in unit_yields.items()},
            quality_distribution=dict(grade_dist),
        )

    # =========================================================================
    # 11. Sales and Income Report
    # =========================================================================

    @classmethod
    def get_sales_income_report(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        crop_id: Optional[UUID] = None,
        payment_status: Optional[str] = None,
        period: Optional[ReportingPeriod] = None,
    ) -> SalesIncomeReportData:
        """
        Generate consolidated revenue report with produce sales and other income.
        Calculates sales revenue using final sale amount after discount.
        """
        period = period or cls.resolve_date_range()
        farm_ids, farm_name = cls._resolve_owned_farms(db, user_id, farm_id)

        # 1. Sales Records
        sales_q = db.query(Sale, Farm).join(Farm, Sale.farm_id == Farm.id).filter(Farm.id.in_(farm_ids))
        if crop_id:
            sales_q = sales_q.filter(Sale.crop_id == crop_id)
        if payment_status:
            sales_q = sales_q.filter(Sale.payment_status == payment_status)
        if period.start_date:
            sales_q = sales_q.filter(Sale.sale_date >= period.start_date)
        if period.end_date:
            sales_q = sales_q.filter(Sale.sale_date <= period.end_date)

        sales_records = sales_q.order_by(desc(Sale.sale_date)).all()

        # 2. Other Income Records
        income_q = db.query(OtherIncome, Farm).join(Farm, OtherIncome.farm_id == Farm.id).filter(Farm.id.in_(farm_ids))
        if period.start_date:
            income_q = income_q.filter(OtherIncome.income_date >= period.start_date)
        if period.end_date:
            income_q = income_q.filter(OtherIncome.income_date <= period.end_date)

        income_records = income_q.order_by(desc(OtherIncome.income_date)).all()

        items: List[SalesIncomeReportItem] = []
        tot_sales_rev = Decimal("0.00")
        tot_other_inc = Decimal("0.00")
        tot_received = Decimal("0.00")
        tot_outstanding = Decimal("0.00")

        # Map produce sales
        for s, frm in sales_records:
            tot_sales_rev += s.total_amount
            tot_received += s.amount_paid
            tot_outstanding += s.outstanding_amount

            items.append(
                SalesIncomeReportItem(
                    entry_id=s.id,
                    entry_type="produce_sale",
                    reference_number=s.sale_number,
                    item_name=s.product_name,
                    transaction_date=s.sale_date,
                    buyer_or_source=s.buyer_name,
                    quantity=s.quantity,
                    unit=s.unit,
                    selling_price=s.unit_price,
                    discount=s.discount_amount,
                    final_amount=s.total_amount,
                    amount_paid=s.amount_paid,
                    outstanding_amount=s.outstanding_amount,
                    payment_status=s.payment_status,
                    payment_method=s.payment_method,
                    farm_id=frm.id,
                    farm_name=frm.name,
                    notes=s.notes,
                )
            )

        # Map other incomes
        for inc, frm in income_records:
            tot_other_inc += inc.amount
            tot_received += inc.amount  # other income received

            lbl = INCOME_CATEGORY_LABELS.get(inc.category, inc.category.replace("_", " ").title())
            items.append(
                SalesIncomeReportItem(
                    entry_id=inc.id,
                    entry_type="other_income",
                    reference_number=inc.reference_number,
                    item_name=f"Other Income: {lbl}",
                    transaction_date=inc.income_date,
                    buyer_or_source=inc.source or "Direct Receipt",
                    quantity=None,
                    unit=None,
                    selling_price=None,
                    discount=None,
                    final_amount=inc.amount,
                    amount_paid=inc.amount,
                    outstanding_amount=Decimal("0.00"),
                    payment_status="paid",
                    payment_method=inc.payment_method,
                    farm_id=frm.id,
                    farm_name=frm.name,
                    notes=inc.description or inc.notes,
                )
            )

        # Sort combined items by transaction date descending
        items.sort(key=lambda x: x.transaction_date, reverse=True)

        tot_gross = (tot_sales_rev + tot_other_inc).quantize(Decimal("0.01"))

        metadata = ReportMetadata(
            report_category=ReportCategory.SALES_INCOME.value,
            report_title="Sales & Farm Income Report",
            farm_id=farm_id,
            farm_name=farm_name,
            period=period,
            total_records=len(items),
        )

        return SalesIncomeReportData(
            metadata=metadata,
            items=items,
            total_sales_revenue=tot_sales_rev.quantize(Decimal("0.01")),
            total_other_income=tot_other_inc.quantize(Decimal("0.01")),
            total_gross_income=tot_gross,
            total_received=tot_received.quantize(Decimal("0.01")),
            total_outstanding_receivables=tot_outstanding.quantize(Decimal("0.01")),
            produce_sales_count=len(sales_records),
            other_income_count=len(income_records),
        )

    # =========================================================================
    # 12. Financial Summary Report
    # =========================================================================

    @classmethod
    def get_financial_summary_report(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        period: Optional[ReportingPeriod] = None,
    ) -> FinancialSummaryReportData:
        """
        Generate authoritative financial statement strictly adhering to:
        Total Income = Sales Revenue + Other Income
        Recorded Profit/Loss = Total Income - Total Expenses
        """
        period = period or cls.resolve_date_range()
        farm_ids, farm_name = cls._resolve_owned_farms(db, user_id, farm_id)

        # 1. Sales
        sales_q = db.query(Sale).filter(Sale.farm_id.in_(farm_ids))
        if period.start_date:
            sales_q = sales_q.filter(Sale.sale_date >= period.start_date)
        if period.end_date:
            sales_q = sales_q.filter(Sale.sale_date <= period.end_date)
        sales = sales_q.all()

        tot_sales_rev = sum((s.total_amount for s in sales), Decimal("0.00")).quantize(Decimal("0.01"))
        tot_sales_rec = sum((s.amount_paid for s in sales), Decimal("0.00")).quantize(Decimal("0.01"))
        out_receivables = sum((s.outstanding_amount for s in sales), Decimal("0.00")).quantize(Decimal("0.01"))

        # 2. Other Income
        income_q = db.query(OtherIncome).filter(OtherIncome.farm_id.in_(farm_ids))
        if period.start_date:
            income_q = income_q.filter(OtherIncome.income_date >= period.start_date)
        if period.end_date:
            income_q = income_q.filter(OtherIncome.income_date <= period.end_date)
        incomes = income_q.all()

        tot_other_inc = sum((i.amount for i in incomes), Decimal("0.00")).quantize(Decimal("0.01"))

        # Authoritative Gross Income
        tot_income = (tot_sales_rev + tot_other_inc).quantize(Decimal("0.01"))

        # 3. Expenses
        exp_q = db.query(Expense).filter(Expense.farm_id.in_(farm_ids))
        if period.start_date:
            exp_q = exp_q.filter(Expense.expense_date >= period.start_date)
        if period.end_date:
            exp_q = exp_q.filter(Expense.expense_date <= period.end_date)
        expenses = exp_q.all()

        tot_exp = sum((e.amount for e in expenses), Decimal("0.00")).quantize(Decimal("0.01"))
        tot_exp_paid = sum((e.amount_paid for e in expenses), Decimal("0.00")).quantize(Decimal("0.01"))
        out_payables = sum((e.outstanding_balance for e in expenses), Decimal("0.00")).quantize(Decimal("0.01"))

        # 4. Recorded Profit / Loss
        p_l = (tot_income - tot_exp).quantize(Decimal("0.01"))
        is_p = p_l >= Decimal("0.00")
        margin = Decimal("0.00")
        if tot_income > Decimal("0.00"):
            margin = ((p_l / tot_income) * Decimal("100.00")).quantize(Decimal("0.01"))

        # 5. Monthly breakdown
        monthly_map: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {
                "sales_rev": Decimal("0.00"),
                "other_inc": Decimal("0.00"),
                "expenses": Decimal("0.00"),
                "date_obj": date.today(),
            }
        )

        for s in sales:
            m_key = s.sale_date.strftime("%Y-%m")
            monthly_map[m_key]["sales_rev"] += s.total_amount
            monthly_map[m_key]["date_obj"] = s.sale_date

        for inc in incomes:
            m_key = inc.income_date.strftime("%Y-%m")
            monthly_map[m_key]["other_inc"] += inc.amount
            monthly_map[m_key]["date_obj"] = inc.income_date

        for exp in expenses:
            m_key = exp.expense_date.strftime("%Y-%m")
            monthly_map[m_key]["expenses"] += exp.amount
            monthly_map[m_key]["date_obj"] = exp.expense_date

        monthly_items: List[MonthlyFinancialSummaryItem] = []
        for m_key in sorted(monthly_map.keys()):
            entry = monthly_map[m_key]
            m_sales = entry["sales_rev"].quantize(Decimal("0.01"))
            m_other = entry["other_inc"].quantize(Decimal("0.01"))
            m_tot = (m_sales + m_other).quantize(Decimal("0.01"))
            m_exp = entry["expenses"].quantize(Decimal("0.01"))
            m_net = (m_tot - m_exp).quantize(Decimal("0.01"))
            m_margin = Decimal("0.00")
            if m_tot > Decimal("0.00"):
                m_margin = ((m_net / m_tot) * Decimal("100.00")).quantize(Decimal("0.01"))

            monthly_items.append(
                MonthlyFinancialSummaryItem(
                    month_key=m_key,
                    month_label=entry["date_obj"].strftime("%b %Y"),
                    sales_revenue=m_sales,
                    other_income=m_other,
                    total_income=m_tot,
                    expenses=m_exp,
                    net_profit_loss=m_net,
                    is_profit=m_net >= Decimal("0.00"),
                    profit_margin_percentage=m_margin,
                )
            )

        # 6. Expense category breakdown
        cat_map: Dict[str, Decimal] = defaultdict(Decimal)
        cat_counts: Dict[str, int] = defaultdict(int)
        for exp in expenses:
            cat_map[exp.category] += exp.amount
            cat_counts[exp.category] += 1

        exp_summaries: List[ExpenseCategorySummary] = []
        for c_key, c_tot in sorted(cat_map.items(), key=lambda x: x[1], reverse=True):
            pct = Decimal("0.00")
            if tot_exp > Decimal("0.00"):
                pct = ((c_tot / tot_exp) * Decimal("100.00")).quantize(Decimal("0.01"))
            exp_summaries.append(
                ExpenseCategorySummary(
                    category=c_key,
                    category_label=EXPENSE_CATEGORY_LABELS.get(c_key, c_key.replace("_", " ").title()),
                    total_amount=c_tot.quantize(Decimal("0.01")),
                    percentage=pct,
                    count=cat_counts[c_key],
                )
            )

        metadata = ReportMetadata(
            report_category=ReportCategory.FINANCIAL_SUMMARY.value,
            report_title="Authoritative Financial Summary & Profit/Loss Statement",
            farm_id=farm_id,
            farm_name=farm_name,
            period=period,
            total_records=len(sales) + len(incomes) + len(expenses),
        )

        return FinancialSummaryReportData(
            metadata=metadata,
            total_sales_revenue=tot_sales_rev,
            total_other_income=tot_other_inc,
            total_income=tot_income,
            total_expenses=tot_exp,
            recorded_profit_loss=p_l,
            is_profit=is_p,
            profit_margin_percentage=margin,
            total_sales_received=tot_sales_rec,
            outstanding_receivables=out_receivables,
            total_expenses_paid=tot_exp_paid,
            outstanding_payables=out_payables,
            sales_count=len(sales),
            income_count=len(incomes),
            expenses_count=len(expenses),
            monthly_breakdown=monthly_items,
            expense_category_breakdown=exp_summaries,
        )

    # =========================================================================
    # Unified Report Dispatcher & Tabular Extractor (for Previews & Exports)
    # =========================================================================

    @classmethod
    def generate_unified_report(
        cls,
        db: Session,
        user_id: UUID,
        category: ReportCategory,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        crop_id: Optional[UUID] = None,
        labour_id: Optional[UUID] = None,
        expense_category: Optional[str] = None,
        status_filter: Optional[str] = None,
        preset: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> UnifiedReportResponse:
        """Route request to category handler and produce a standardized table dataset."""
        period = cls.resolve_date_range(preset=preset, custom_start=start_date, custom_end=end_date)

        summary_cards: Dict[str, Any] = {}
        headers: List[str] = []
        rows: List[Dict[str, Any]] = []
        raw_data: Any = None

        if category == ReportCategory.FARM_SUMMARY:
            raw_data = cls.get_farm_summary_report(db, user_id, farm_id=farm_id, period=period)
            summary_cards = raw_data.summary
            headers = ["Farm Name", "Location", "Total Area", "Fields", "Cultivated Area", "Active Crops", "Workforce", "Tasks in Period"]
            for f in raw_data.farms:
                rows.append({
                    "Farm Name": f.farm_name,
                    "Location": f.location,
                    "Total Area": f"{f.total_area} {f.area_unit}",
                    "Fields": f.total_fields,
                    "Cultivated Area": f"{f.cultivated_area} {f.area_unit}",
                    "Active Crops": f"{f.active_crops_count} ({', '.join(f.active_crops[:2])}{'...' if len(f.active_crops) > 2 else ''})",
                    "Workforce": f.total_workers,
                    "Tasks in Period": f.total_activities_count,
                })

        elif category == ReportCategory.CROP:
            raw_data = cls.get_crop_report(
                db, user_id, farm_id=farm_id, field_id=field_id, crop_status=status_filter, period=period
            )
            summary_cards = {
                "total_crops": raw_data.total_crops,
                "total_planted_area": float(raw_data.total_planted_area),
                "active_crops_count": raw_data.active_crops_count,
                "harvested_crops_count": raw_data.harvested_crops_count,
            }
            headers = ["Crop Name", "Variety", "Farm", "Field", "Sowing Date", "Harvest Date", "Status", "Planted Area", "Harvest Yield"]
            for c in raw_data.items:
                rows.append({
                    "Crop Name": c.crop_name,
                    "Variety": c.variety,
                    "Farm": c.farm_name,
                    "Field": c.field_name,
                    "Sowing Date": c.sowing_date.strftime("%Y-%m-%d"),
                    "Harvest Date": c.actual_harvest_date.strftime("%Y-%m-%d") if c.actual_harvest_date else (c.expected_harvest_date.strftime("%Y-%m-%d") if c.expected_harvest_date else "-"),
                    "Status": c.status.replace("_", " ").title(),
                    "Planted Area": f"{c.planted_area or 0} {c.planted_area_unit}",
                    "Harvest Yield": f"{c.harvest_yield} {c.harvest_unit}" if c.harvest_yield else "-",
                })

        elif category == ReportCategory.LABOUR:
            raw_data = cls.get_labour_report(
                db, user_id, farm_id=farm_id, labour_id=labour_id, worker_status=status_filter, period=period
            )
            summary_cards = {
                "total_workers": raw_data.total_workers,
                "active_workers": raw_data.active_workers,
                "total_wages_earned": float(raw_data.total_wages_earned),
                "total_wages_paid": float(raw_data.total_wages_paid),
                "total_wages_outstanding": float(raw_data.total_wages_outstanding),
            }
            headers = ["Worker Name", "Role / Work Type", "Farm", "Phone", "Daily Wage", "Working Days", "Hours", "Attendance %", "Salary Earned", "Amount Paid", "Balance"]
            for w in raw_data.items:
                rows.append({
                    "Worker Name": w.name,
                    "Role / Work Type": w.work_type,
                    "Farm": w.farm_name,
                    "Phone": w.phone or "-",
                    "Daily Wage": f"₹{w.daily_wage:,.2f}",
                    "Working Days": w.total_working_days,
                    "Hours": f"{w.total_working_hours}h",
                    "Attendance %": f"{w.attendance_rate}%",
                    "Salary Earned": f"₹{w.total_salary_earned:,.2f}",
                    "Amount Paid": f"₹{w.total_salary_paid:,.2f}",
                    "Balance": f"₹{w.outstanding_balance:,.2f}",
                })

        elif category == ReportCategory.ATTENDANCE:
            raw_data = cls.get_attendance_report(
                db, user_id, farm_id=farm_id, labour_id=labour_id, status_filter=status_filter, period=period
            )
            summary_cards = {
                "total_records": raw_data.total_records,
                "present_count": raw_data.present_count,
                "absent_count": raw_data.absent_count,
                "overall_attendance_rate": float(raw_data.overall_attendance_rate),
                "total_working_hours": float(raw_data.total_working_hours),
            }
            headers = ["Worker Name", "Farm", "Role", "Date", "Status", "Check In", "Check Out", "Hours Worked", "Notes"]
            for a in raw_data.items:
                rows.append({
                    "Worker Name": a.worker_name,
                    "Farm": a.farm_name,
                    "Role": a.work_type,
                    "Date": a.attendance_date.strftime("%Y-%m-%d"),
                    "Status": a.status.replace("_", " ").title(),
                    "Check In": a.check_in or "-",
                    "Check Out": a.check_out or "-",
                    "Hours Worked": f"{a.working_hours}h",
                    "Notes": a.notes or "-",
                })

        elif category == ReportCategory.SALARY:
            raw_data = cls.get_salary_report(
                db, user_id, farm_id=farm_id, labour_id=labour_id, payment_status=status_filter, period=period
            )
            summary_cards = {
                "total_salary_earned": float(raw_data.total_salary_earned),
                "total_amount_paid": float(raw_data.total_amount_paid),
                "total_outstanding_amount": float(raw_data.total_outstanding_amount),
                "paid_records_count": raw_data.paid_records_count,
                "pending_records_count": raw_data.pending_records_count,
            }
            headers = ["Worker Name", "Farm", "Period Start", "Period End", "Present Days", "Daily Wage", "Net Salary", "Amount Paid", "Outstanding Balance", "Payment Status"]
            for s in raw_data.items:
                rows.append({
                    "Worker Name": s.worker_name,
                    "Farm": s.farm_name,
                    "Period Start": s.period_start.strftime("%Y-%m-%d"),
                    "Period End": s.period_end.strftime("%Y-%m-%d"),
                    "Present Days": f"{s.present_days}",
                    "Daily Wage": f"₹{s.daily_wage_snapshot:,.2f}",
                    "Net Salary": f"₹{s.net_salary:,.2f}",
                    "Amount Paid": f"₹{s.amount_paid:,.2f}",
                    "Outstanding Balance": f"₹{s.outstanding_balance:,.2f}",
                    "Payment Status": s.status.title(),
                })

        elif category == ReportCategory.FERTILIZER_PESTICIDE:
            raw_data = cls.get_fertilizer_pesticide_report(
                db, user_id, farm_id=farm_id, field_id=field_id, crop_id=crop_id, category=expense_category, period=period
            )
            summary_cards = {
                "total_applications": raw_data.total_applications,
                "fertilizer_applications_count": raw_data.fertilizer_applications_count,
                "pesticide_applications_count": raw_data.pesticide_applications_count,
                "total_expenditure": float(raw_data.total_expenditure),
            }
            headers = ["Product Name", "Category", "Product Type", "Quantity", "Date", "Farm", "Field", "Crop", "Total Cost", "Method"]
            for a in raw_data.items:
                rows.append({
                    "Product Name": a.product_name,
                    "Category": a.application_category.title(),
                    "Product Type": a.product_type,
                    "Quantity": f"{a.quantity} {a.unit}",
                    "Date": a.application_date.strftime("%Y-%m-%d"),
                    "Farm": a.farm_name,
                    "Field": a.field_name,
                    "Crop": a.crop_name or "-",
                    "Total Cost": f"₹{a.total_cost:,.2f}" if a.total_cost is not None else "-",
                    "Method": a.application_method or "-",
                })

        elif category == ReportCategory.IRRIGATION:
            raw_data = cls.get_irrigation_report(
                db, user_id, farm_id=farm_id, field_id=field_id, period=period
            )
            summary_cards = {
                "total_irrigation_sessions": raw_data.total_irrigation_sessions,
                "total_duration_hours": float(raw_data.total_duration_hours),
                "fields_covered_count": raw_data.fields_covered_count,
            }
            headers = ["Farm", "Field", "Crop", "Date", "Irrigation Method", "Duration", "Status", "Notes"]
            for ir in raw_data.items:
                rows.append({
                    "Farm": ir.farm_name,
                    "Field": ir.field_name or "-",
                    "Crop": ir.crop_name or "-",
                    "Date": ir.irrigation_date.strftime("%Y-%m-%d"),
                    "Irrigation Method": ir.irrigation_method,
                    "Duration": f"{ir.duration_hours}h" if ir.duration_hours else "-",
                    "Status": ir.status.replace("_", " ").title(),
                    "Notes": ir.notes or "-",
                })

        elif category == ReportCategory.EXPENSE:
            raw_data = cls.get_expense_report(
                db, user_id, farm_id=farm_id, field_id=field_id, category=expense_category, payment_status=status_filter, period=period
            )
            summary_cards = {
                "total_expenses": float(raw_data.total_expenses),
                "total_paid": float(raw_data.total_paid),
                "total_outstanding": float(raw_data.total_outstanding),
                "records_count": len(raw_data.items),
            }
            headers = ["Expense Title", "Category", "Farm", "Field", "Date", "Amount", "Amount Paid", "Balance", "Payment Status", "Vendor"]
            for e in raw_data.items:
                rows.append({
                    "Expense Title": e.title,
                    "Category": e.category_label,
                    "Farm": e.farm_name,
                    "Field": e.field_name or "-",
                    "Date": e.expense_date.strftime("%Y-%m-%d"),
                    "Amount": f"₹{e.amount:,.2f}",
                    "Amount Paid": f"₹{e.amount_paid:,.2f}",
                    "Balance": f"₹{e.outstanding_balance:,.2f}",
                    "Payment Status": e.payment_status.replace("_", " ").title(),
                    "Vendor": e.vendor_name or "-",
                })

        elif category == ReportCategory.MACHINERY:
            raw_data = cls.get_machinery_report(
                db, user_id, farm_id=farm_id, operational_status=status_filter, period=period
            )
            summary_cards = {
                "total_equipment": raw_data.total_equipment,
                "available_count": raw_data.available_count,
                "under_maintenance_count": raw_data.under_maintenance_count,
                "total_asset_value": float(raw_data.total_asset_value),
                "total_maintenance_expenditure": float(raw_data.total_maintenance_expenditure),
            }
            headers = ["Equipment Name", "Type", "Brand / Model", "Serial Number", "Farm", "Status", "Condition", "Purchase Date", "Asset Value", "Maintenance Logs", "Maintenance Cost"]
            for m in raw_data.items:
                rows.append({
                    "Equipment Name": m.equipment_name,
                    "Type": m.equipment_type,
                    "Brand / Model": f"{m.brand or ''} {m.model_number or ''}".strip() or "-",
                    "Serial Number": m.serial_number or "-",
                    "Farm": m.farm_name,
                    "Status": m.operational_status.replace("_", " ").title(),
                    "Condition": m.condition.title(),
                    "Purchase Date": m.purchase_date.strftime("%Y-%m-%d") if m.purchase_date else "-",
                    "Asset Value": f"₹{m.purchase_price:,.2f}" if m.purchase_price is not None else "-",
                    "Maintenance Logs": m.maintenance_count,
                    "Maintenance Cost": f"₹{m.total_maintenance_cost:,.2f}",
                })

        elif category == ReportCategory.HARVEST:
            raw_data = cls.get_harvest_report(
                db, user_id, farm_id=farm_id, field_id=field_id, crop_id=crop_id, quality_grade=status_filter, period=period
            )
            summary_cards = {
                "total_harvests": raw_data.total_harvests,
                "yields_by_unit": {k: float(v) for k, v in raw_data.total_yield_by_unit.items()},
                "quality_grades": raw_data.quality_distribution,
            }
            headers = ["Crop", "Variety", "Farm", "Field", "Harvest Date", "Quantity", "Grade", "Method", "Storage", "Batch / Notes"]
            for h in raw_data.items:
                rows.append({
                    "Crop": h.crop_name,
                    "Variety": h.variety,
                    "Farm": h.farm_name,
                    "Field": h.field_name,
                    "Harvest Date": h.harvest_date.strftime("%Y-%m-%d"),
                    "Quantity": f"{h.quantity} {h.unit}",
                    "Grade": h.quality_grade,
                    "Method": h.harvest_method or "-",
                    "Storage": h.storage_location or "-",
                    "Batch / Notes": h.batch_number or h.notes or "-",
                })

        elif category == ReportCategory.SALES_INCOME:
            raw_data = cls.get_sales_income_report(
                db, user_id, farm_id=farm_id, crop_id=crop_id, payment_status=status_filter, period=period
            )
            summary_cards = {
                "total_sales_revenue": float(raw_data.total_sales_revenue),
                "total_other_income": float(raw_data.total_other_income),
                "total_gross_income": float(raw_data.total_gross_income),
                "total_received": float(raw_data.total_received),
                "total_outstanding_receivables": float(raw_data.total_outstanding_receivables),
            }
            headers = ["Type", "Ref / Invoice", "Produce / Source", "Farm", "Date", "Buyer / Entity", "Quantity", "Final Amount", "Amount Paid", "Balance", "Payment Status"]
            for si in raw_data.items:
                rows.append({
                    "Type": "Produce Sale" if si.entry_type == "produce_sale" else "Other Income",
                    "Ref / Invoice": si.reference_number or "-",
                    "Produce / Source": si.item_name,
                    "Farm": si.farm_name,
                    "Date": si.transaction_date.strftime("%Y-%m-%d"),
                    "Buyer / Entity": si.buyer_or_source,
                    "Quantity": f"{si.quantity} {si.unit}" if si.quantity is not None else "-",
                    "Final Amount": f"₹{si.final_amount:,.2f}",
                    "Amount Paid": f"₹{si.amount_paid:,.2f}",
                    "Balance": f"₹{si.outstanding_amount:,.2f}",
                    "Payment Status": si.payment_status.replace("_", " ").title(),
                })

        elif category == ReportCategory.FINANCIAL_SUMMARY:
            raw_data = cls.get_financial_summary_report(
                db, user_id, farm_id=farm_id, period=period
            )
            summary_cards = {
                "total_sales_revenue": float(raw_data.total_sales_revenue),
                "total_other_income": float(raw_data.total_other_income),
                "total_income": float(raw_data.total_income),
                "total_expenses": float(raw_data.total_expenses),
                "recorded_profit_loss": float(raw_data.recorded_profit_loss),
                "is_profit": raw_data.is_profit,
                "profit_margin_percentage": float(raw_data.profit_margin_percentage),
            }
            headers = ["Month", "Produce Sales Revenue", "Other Income", "Total Income", "Operating Expenses", "Net Profit / Loss", "Margin %"]
            for m in raw_data.monthly_breakdown:
                rows.append({
                    "Month": m.month_label,
                    "Produce Sales Revenue": f"₹{m.sales_revenue:,.2f}",
                    "Other Income": f"₹{m.other_income:,.2f}",
                    "Total Income": f"₹{m.total_income:,.2f}",
                    "Operating Expenses": f"₹{m.expenses:,.2f}",
                    "Net Profit / Loss": f"₹{m.net_profit_loss:,.2f}",
                    "Margin %": f"{m.profit_margin_percentage}%",
                })

        return UnifiedReportResponse(
            metadata=raw_data.metadata,
            category=category,
            summary_cards=summary_cards,
            table_headers=headers,
            table_rows=rows,
            data=raw_data,
        )
