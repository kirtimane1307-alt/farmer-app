"""Service layer implementing Phase 17: Dashboard Analytics & Data Aggregation."""

from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.farm import Farm
from app.models.field import Field
from app.models.crop import Crop
from app.models.labour import Labour
from app.models.attendance import Attendance
from app.models.expense import Expense, EXPENSE_CATEGORY_LABELS
from app.models.sale import Sale
from app.models.income import OtherIncome
from app.models.harvest import Harvest
from app.models.calendar import FarmCalendarEvent
from app.schemas.dashboard import (
    DashboardKpiSummary,
    DashboardFinancialOverview,
    IncomeExpenseTrendItem,
    ExpenseCategoryItem,
    AttendanceTrendItem,
    CropDistributionItem,
    HarvestTrendItem,
    DashboardUpcomingActivity,
    DashboardAnalyticsResponse,
)


class DashboardService:
    """Authoritative business logic for Dashboard Analytics & Recharts telemetry."""

    @staticmethod
    def _resolve_owned_farms(
        db: Session, user_id: UUID, farm_id: Optional[UUID] = None
    ) -> Tuple[List[UUID], Optional[str]]:
        """Validate farm ownership and retrieve target farm IDs for user."""
        if farm_id:
            farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == user_id).first()
            if not farm:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Farm not found or unauthorized for this user.",
                )
            return [farm.id], farm.name

        farms = db.query(Farm).filter(Farm.user_id == user_id).all()
        return [f.id for f in farms], None

    @staticmethod
    def _validate_date_bounds(start_date: Optional[date], end_date: Optional[date]) -> None:
        """Ensure start_date is not after end_date."""
        if start_date and end_date and start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_date cannot be after end_date.",
            )

    @classmethod
    def get_dashboard_analytics(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> DashboardAnalyticsResponse:
        """Compute full consolidated dashboard analytics payload."""
        cls._validate_date_bounds(start_date, end_date)
        farm_ids, farm_name = cls._resolve_owned_farms(db, user_id, farm_id)

        # Handle empty user estate gracefully
        if not farm_ids:
            return DashboardAnalyticsResponse(
                kpi=DashboardKpiSummary(),
                financial_overview=DashboardFinancialOverview(
                    total_sales_revenue=Decimal("0.00"),
                    total_other_income=Decimal("0.00"),
                    total_income=Decimal("0.00"),
                    total_expenses=Decimal("0.00"),
                    net_profit_loss=Decimal("0.00"),
                    is_profit=True,
                    profit_margin_percentage=Decimal("0.00"),
                    total_sales_received=Decimal("0.00"),
                    outstanding_receivables=Decimal("0.00"),
                    total_expenses_paid=Decimal("0.00"),
                    outstanding_payables=Decimal("0.00"),
                ),
                income_expense_trend=[],
                expense_breakdown=[],
                attendance_trend=[],
                crop_distribution=[],
                harvest_trend=[],
                upcoming_activities=[],
                selected_farm_id=farm_id,
                selected_farm_name=farm_name,
                start_date=start_date,
                end_date=end_date,
                period_label="All Time",
            )

        # -------------------------------------------------------------
        # 1. Farms and Fields Overview
        # -------------------------------------------------------------
        total_farms = 1 if farm_id else len(farm_ids)
        fields = db.query(Field).filter(Field.farm_id.in_(farm_ids)).all()
        total_fields = len(fields)
        field_id_map = {f.id: f.name for f in fields}

        # -------------------------------------------------------------
        # 2. Crops & Crop Distribution
        # -------------------------------------------------------------
        field_ids = [f.id for f in fields]
        crops = []
        if field_ids:
            crops = db.query(Crop).filter(Crop.field_id.in_(field_ids)).all()

        total_crops = len(crops)
        active_crops = len([c for c in crops if c.status in ("growing", "planned", "ready_to_harvest")])
        total_planted_area = sum(Decimal(str(c.planted_area or 0)) for c in crops)

        # Crop distribution grouping
        crop_groups: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {"area": Decimal("0.00"), "unit": "Acres", "variety": "", "status": "", "count": 0}
        )
        for c in crops:
            key = c.name
            area_val = Decimal(str(c.planted_area or 0))
            crop_groups[key]["area"] += area_val
            crop_groups[key]["unit"] = c.planted_area_unit or "Acres"
            crop_groups[key]["variety"] = c.variety
            crop_groups[key]["status"] = c.status
            crop_groups[key]["count"] += 1

        crop_distribution: List[CropDistributionItem] = []
        for name, data in crop_groups.items():
            pct = (
                Decimal(str(round((data["area"] / total_planted_area * 100), 2)))
                if total_planted_area > 0
                else Decimal("0.00")
            )
            crop_distribution.append(
                CropDistributionItem(
                    crop_name=name,
                    variety=data["variety"],
                    status=data["status"],
                    planted_area=data["area"],
                    planted_area_unit=data["unit"],
                    field_count=data["count"],
                    percentage=pct,
                )
            )
        crop_distribution.sort(key=lambda x: x.planted_area, reverse=True)

        # -------------------------------------------------------------
        # 3. Workforce & Attendance
        # -------------------------------------------------------------
        labourers = db.query(Labour).filter(Labour.farm_id.in_(farm_ids)).all()
        total_labourers = len(labourers)
        active_labourers = len([l for l in labourers if l.status == "active"])
        labour_ids = [l.id for l in labourers]

        attendances: List[Attendance] = []
        if labour_ids:
            att_q = db.query(Attendance).filter(Attendance.labour_id.in_(labour_ids))
            if start_date:
                att_q = att_q.filter(Attendance.attendance_date >= start_date)
            if end_date:
                att_q = att_q.filter(Attendance.attendance_date <= end_date)
            attendances = att_q.all()

        total_working_minutes = sum(a.working_minutes for a in attendances)
        total_working_hours = Decimal(str(round(total_working_minutes / 60, 2)))
        hours_int = total_working_minutes // 60
        mins_int = total_working_minutes % 60
        total_working_hours_formatted = f"{hours_int}h {mins_int}m" if total_working_minutes > 0 else "0h"

        # Today's attendance numbers
        today_date = date.today()
        today_records = [a for a in attendances if a.attendance_date == today_date]
        present_today = len([a for a in today_records if a.status == "present"])
        attendance_rate = (
            Decimal(str(round((present_today / active_labourers * 100), 2)))
            if active_labourers > 0
            else Decimal("0.00")
        )

        # Attendance Trend Grouping
        att_by_date: Dict[date, Dict[str, Any]] = defaultdict(
            lambda: {"present": 0, "absent": 0, "half_day": 0, "leave": 0, "minutes": 0}
        )
        for a in attendances:
            d = a.attendance_date
            st = a.status.lower()
            if st in att_by_date[d]:
                att_by_date[d][st] += 1
            att_by_date[d]["minutes"] += a.working_minutes

        attendance_trend: List[AttendanceTrendItem] = []
        for d in sorted(att_by_date.keys()):
            val = att_by_date[d]
            hrs = Decimal(str(round(val["minutes"] / 60, 2)))
            attendance_trend.append(
                AttendanceTrendItem(
                    date=d.isoformat(),
                    date_label=d.strftime("%b %d"),
                    present=val["present"],
                    absent=val["absent"],
                    half_day=val["half_day"],
                    leave=val["leave"],
                    total_workers=val["present"] + val["absent"] + val["half_day"] + val["leave"],
                    total_working_hours=hrs,
                )
            )

        # -------------------------------------------------------------
        # 4. Produce Sales (Revenue)
        # -------------------------------------------------------------
        sale_q = db.query(Sale).filter(Sale.farm_id.in_(farm_ids))
        if start_date:
            sale_q = sale_q.filter(Sale.sale_date >= start_date)
        if end_date:
            sale_q = sale_q.filter(Sale.sale_date <= end_date)
        sales = sale_q.all()

        total_sales_revenue = sum(Decimal(str(s.total_amount)) for s in sales)
        total_sales_received = sum(Decimal(str(s.amount_paid)) for s in sales)
        outstanding_receivables = sum(Decimal(str(s.outstanding_amount)) for s in sales)
        sales_count = len(sales)

        # -------------------------------------------------------------
        # 5. Other Farm Income
        # -------------------------------------------------------------
        inc_q = db.query(OtherIncome).filter(OtherIncome.farm_id.in_(farm_ids))
        if start_date:
            inc_q = inc_q.filter(OtherIncome.income_date >= start_date)
        if end_date:
            inc_q = inc_q.filter(OtherIncome.income_date <= end_date)
        incomes = inc_q.all()

        total_other_income = sum(Decimal(str(i.amount)) for i in incomes)
        income_count = len(incomes)

        # Financial Core Formulas:
        # Total Income = Sales Revenue + Other Income
        # Recorded Profit/Loss = Total Income - Total Expenses
        total_income = total_sales_revenue + total_other_income

        # -------------------------------------------------------------
        # 6. Expenses & Expense Category Breakdown
        # -------------------------------------------------------------
        exp_q = db.query(Expense).filter(Expense.farm_id.in_(farm_ids))
        if start_date:
            exp_q = exp_q.filter(Expense.expense_date >= start_date)
        if end_date:
            exp_q = exp_q.filter(Expense.expense_date <= end_date)
        expenses = exp_q.all()

        total_expenses = sum(Decimal(str(e.amount)) for e in expenses)
        total_expenses_paid = sum(Decimal(str(e.amount_paid)) for e in expenses)
        outstanding_payables = sum(Decimal(str(e.outstanding_balance)) for e in expenses)
        expense_count = len(expenses)

        net_profit_loss = total_income - total_expenses
        is_profit = net_profit_loss >= Decimal("0.00")
        profit_margin_percentage = (
            Decimal(str(round((net_profit_loss / total_income * 100), 2)))
            if total_income > Decimal("0.00")
            else Decimal("0.00")
        )

        # Expense breakdown grouping
        exp_groups: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {"amount": Decimal("0.00"), "count": 0}
        )
        for e in expenses:
            cat = e.category.lower()
            exp_groups[cat]["amount"] += Decimal(str(e.amount))
            exp_groups[cat]["count"] += 1

        expense_breakdown: List[ExpenseCategoryItem] = []
        for cat, data in exp_groups.items():
            pct = (
                Decimal(str(round((data["amount"] / total_expenses * 100), 2)))
                if total_expenses > Decimal("0.00")
                else Decimal("0.00")
            )
            label = EXPENSE_CATEGORY_LABELS.get(cat, cat.replace("_", " ").title())
            expense_breakdown.append(
                ExpenseCategoryItem(
                    category=cat,
                    category_label=label,
                    amount=data["amount"],
                    percentage=pct,
                    transaction_count=data["count"],
                )
            )
        expense_breakdown.sort(key=lambda x: x.amount, reverse=True)

        # -------------------------------------------------------------
        # 7. Income vs Expenses Timeline (Recharts Trend)
        # -------------------------------------------------------------
        timeline: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {
                "sales_revenue": Decimal("0.00"),
                "other_income": Decimal("0.00"),
                "total_expenses": Decimal("0.00"),
                "label": "",
            }
        )

        for s in sales:
            month_key = s.sale_date.strftime("%Y-%m")
            timeline[month_key]["sales_revenue"] += Decimal(str(s.total_amount))
            timeline[month_key]["label"] = s.sale_date.strftime("%b %Y")

        for inc in incomes:
            month_key = inc.income_date.strftime("%Y-%m")
            timeline[month_key]["other_income"] += Decimal(str(inc.amount))
            timeline[month_key]["label"] = inc.income_date.strftime("%b %Y")

        for e in expenses:
            month_key = e.expense_date.strftime("%Y-%m")
            timeline[month_key]["total_expenses"] += Decimal(str(e.amount))
            timeline[month_key]["label"] = e.expense_date.strftime("%b %Y")

        income_expense_trend: List[IncomeExpenseTrendItem] = []
        for m_key in sorted(timeline.keys()):
            m_data = timeline[m_key]
            m_sales = m_data["sales_revenue"]
            m_other = m_data["other_income"]
            m_inc = m_sales + m_other
            m_exp = m_data["total_expenses"]
            m_pl = m_inc - m_exp
            income_expense_trend.append(
                IncomeExpenseTrendItem(
                    period=m_key,
                    period_label=m_data["label"] or m_key,
                    sales_revenue=m_sales,
                    other_income=m_other,
                    total_income=m_inc,
                    total_expenses=m_exp,
                    net_profit_loss=m_pl,
                    is_profit=m_pl >= Decimal("0.00"),
                )
            )

        # -------------------------------------------------------------
        # 8. Harvest Yield Trend
        # -------------------------------------------------------------
        harv_q = db.query(Harvest).filter(Harvest.farm_id.in_(farm_ids))
        if start_date:
            harv_q = harv_q.filter(Harvest.harvest_date >= start_date)
        if end_date:
            harv_q = harv_q.filter(Harvest.harvest_date <= end_date)
        harvests = harv_q.order_by(Harvest.harvest_date.asc()).all()

        crop_id_map = {c.id: c.name for c in crops}
        harvest_trend: List[HarvestTrendItem] = []
        for h in harvests:
            c_name = crop_id_map.get(h.crop_id, "Farm Crop")
            harvest_trend.append(
                HarvestTrendItem(
                    harvest_date=h.harvest_date.isoformat(),
                    date_label=h.harvest_date.strftime("%b %d"),
                    crop_name=c_name,
                    quantity=Decimal(str(h.quantity)),
                    unit=h.unit,
                    quality_grade=h.quality_grade,
                )
            )

        # -------------------------------------------------------------
        # 9. Upcoming Farm Activities (Phase 16 Calendar)
        # -------------------------------------------------------------
        cal_q = (
            db.query(FarmCalendarEvent)
            .filter(
                FarmCalendarEvent.farm_id.in_(farm_ids),
                FarmCalendarEvent.status.in_(["planned", "in_progress"]),
            )
            .order_by(FarmCalendarEvent.start_datetime.asc())
            .limit(8)
        )
        events = cal_q.all()

        farm_id_map = {f.id: f.name for f in db.query(Farm).filter(Farm.id.in_(farm_ids)).all()}
        upcoming_activities: List[DashboardUpcomingActivity] = []
        for evt in events:
            upcoming_activities.append(
                DashboardUpcomingActivity(
                    id=evt.id,
                    title=evt.title,
                    start_datetime=evt.start_datetime.isoformat(),
                    end_datetime=evt.end_datetime.isoformat() if evt.end_datetime else None,
                    activity_type=evt.activity_type,
                    status=evt.status,
                    priority=evt.priority or "medium",
                    farm_id=evt.farm_id,
                    farm_name=farm_id_map.get(evt.farm_id, "Farm Estate"),
                    field_name=field_id_map.get(evt.field_id) if evt.field_id else None,
                    crop_name=crop_id_map.get(evt.crop_id) if evt.crop_id else None,
                )
            )

        # Build Response
        kpi = DashboardKpiSummary(
            total_farms=total_farms,
            total_fields=total_fields,
            active_crops=active_crops,
            total_crops=total_crops,
            total_planted_area=total_planted_area,
            total_labourers=total_labourers,
            active_labourers=active_labourers,
            present_today=present_today,
            attendance_rate=attendance_rate,
            total_working_hours=total_working_hours,
            total_working_hours_formatted=total_working_hours_formatted,
            total_sales_revenue=total_sales_revenue,
            total_other_income=total_other_income,
            total_income=total_income,
            total_expenses=total_expenses,
            net_profit_loss=net_profit_loss,
            is_profit=is_profit,
            profit_margin_percentage=profit_margin_percentage,
        )

        financial_overview = DashboardFinancialOverview(
            total_sales_revenue=total_sales_revenue,
            total_other_income=total_other_income,
            total_income=total_income,
            total_expenses=total_expenses,
            net_profit_loss=net_profit_loss,
            is_profit=is_profit,
            profit_margin_percentage=profit_margin_percentage,
            total_sales_received=total_sales_received,
            outstanding_receivables=outstanding_receivables,
            total_expenses_paid=total_expenses_paid,
            outstanding_payables=outstanding_payables,
            sales_transaction_count=sales_count,
            income_transaction_count=income_count,
            expense_transaction_count=expense_count,
        )

        period_label = "All Time"
        if start_date and end_date:
            period_label = f"{start_date.strftime('%b %d, %Y')} – {end_date.strftime('%b %d, %Y')}"
        elif start_date:
            period_label = f"Since {start_date.strftime('%b %d, %Y')}"
        elif end_date:
            period_label = f"Until {end_date.strftime('%b %d, %Y')}"

        return DashboardAnalyticsResponse(
            kpi=kpi,
            financial_overview=financial_overview,
            income_expense_trend=income_expense_trend,
            expense_breakdown=expense_breakdown,
            attendance_trend=attendance_trend,
            crop_distribution=crop_distribution,
            harvest_trend=harvest_trend,
            upcoming_activities=upcoming_activities,
            selected_farm_id=farm_id,
            selected_farm_name=farm_name,
            start_date=start_date,
            end_date=end_date,
            period_label=period_label,
        )
