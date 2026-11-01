"""FastAPI router for Phase 18: Reports Management.

Provides high-level overview metrics, individual category reporting endpoints,
unified table preview generation, and PDF / Excel binary streaming exports.
"""

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.report import (
    ReportCategory,
    DateRangePreset,
    ReportsOverviewResponse,
    FarmSummaryReportData,
    CropReportData,
    LabourReportData,
    AttendanceReportData,
    SalaryReportData,
    FertilizerPesticideReportData,
    IrrigationReportData,
    ExpenseReportData,
    MachineryReportData,
    HarvestReportData,
    SalesIncomeReportData,
    FinancialSummaryReportData,
    UnifiedReportResponse,
)
from app.services.report_service import ReportService
from app.services.pdf_export_service import PDFExportService
from app.services.excel_export_service import ExcelExportService

reports_router = APIRouter()


# =============================================================================
# Overview & Summary
# =============================================================================

@reports_router.get(
    "/overview",
    response_model=ReportsOverviewResponse,
    summary="Get reports dashboard overview cards",
    description="Returns aggregate KPI telemetry (total farms, crops, labour, revenue, expenses, profit/loss).",
)
def get_reports_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch high-level overview cards for the reports page header."""
    return ReportService.get_overview(db=db, user_id=current_user.id)


# =============================================================================
# Unified Report Preview Endpoint
# =============================================================================

@reports_router.get(
    "/preview",
    response_model=UnifiedReportResponse,
    summary="Generate unified report table preview with filters",
    description="Universal dispatcher returning structured metadata, summary cards, headers, and rows for any category.",
)
def get_unified_report_preview(
    category: ReportCategory = Query(ReportCategory.FINANCIAL_SUMMARY, description="Target report category"),
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID filter"),
    field_id: Optional[UUID] = Query(None, description="Optional field ID filter"),
    crop_id: Optional[UUID] = Query(None, description="Optional crop ID filter"),
    labour_id: Optional[UUID] = Query(None, description="Optional worker ID filter"),
    expense_category: Optional[str] = Query(None, description="Optional expense or chemical category"),
    status: Optional[str] = Query(None, description="Optional status filter"),
    preset: Optional[str] = Query(None, description="Date preset (e.g. today, last_7_days, this_month, etc.)"),
    start_date: Optional[date] = Query(None, description="Custom start date"),
    end_date: Optional[date] = Query(None, description="Custom end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate dynamic tabular preview for frontend interactive tables."""
    return ReportService.generate_unified_report(
        db=db,
        user_id=current_user.id,
        category=category,
        farm_id=farm_id,
        field_id=field_id,
        crop_id=crop_id,
        labour_id=labour_id,
        expense_category=expense_category,
        status_filter=status,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
    )


# =============================================================================
# 1. Farm Summary Report
# =============================================================================

@reports_router.get(
    "/farm-summary",
    response_model=FarmSummaryReportData,
    summary="Farm Summary Report",
)
@reports_router.get(
    "/farms",
    response_model=FarmSummaryReportData,
    include_in_schema=False,
)
def get_farm_summary_report(
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID"),
    preset: Optional[str] = Query(None, description="Date preset"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period = ReportService.resolve_date_range(preset=preset, custom_start=start_date, custom_end=end_date)
    return ReportService.get_farm_summary_report(db=db, user_id=current_user.id, farm_id=farm_id, period=period)


# =============================================================================
# 2. Crop Report
# =============================================================================

@reports_router.get(
    "/crops",
    response_model=CropReportData,
    summary="Crop Cultivation & Harvest Report",
)
def get_crop_report(
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID"),
    field_id: Optional[UUID] = Query(None, description="Optional field ID"),
    crop_status: Optional[str] = Query(None, description="Optional crop status filter"),
    preset: Optional[str] = Query(None, description="Date preset"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period = ReportService.resolve_date_range(preset=preset, custom_start=start_date, custom_end=end_date)
    return ReportService.get_crop_report(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        field_id=field_id,
        crop_status=crop_status,
        period=period,
    )


# =============================================================================
# 3. Labour Report
# =============================================================================

@reports_router.get(
    "/labour",
    response_model=LabourReportData,
    summary="Labour & Workforce Report",
)
def get_labour_report(
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID"),
    labour_id: Optional[UUID] = Query(None, description="Optional worker ID"),
    worker_status: Optional[str] = Query(None, description="Optional active/inactive status"),
    preset: Optional[str] = Query(None, description="Date preset"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period = ReportService.resolve_date_range(preset=preset, custom_start=start_date, custom_end=end_date)
    return ReportService.get_labour_report(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        labour_id=labour_id,
        worker_status=worker_status,
        period=period,
    )


# =============================================================================
# 4. Attendance Report
# =============================================================================

@reports_router.get(
    "/attendance",
    response_model=AttendanceReportData,
    summary="Workforce Attendance Report",
)
def get_attendance_report(
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID"),
    labour_id: Optional[UUID] = Query(None, description="Optional worker ID"),
    status: Optional[str] = Query(None, description="Optional attendance status"),
    preset: Optional[str] = Query(None, description="Date preset"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period = ReportService.resolve_date_range(preset=preset, custom_start=start_date, custom_end=end_date)
    return ReportService.get_attendance_report(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        labour_id=labour_id,
        status_filter=status,
        period=period,
    )


# =============================================================================
# 5. Salary and Payment Report
# =============================================================================

@reports_router.get(
    "/salaries",
    response_model=SalaryReportData,
    summary="Salary & Wage Payment Report",
)
def get_salary_report(
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID"),
    labour_id: Optional[UUID] = Query(None, description="Optional worker ID"),
    payment_status: Optional[str] = Query(None, description="Optional payment status"),
    preset: Optional[str] = Query(None, description="Date preset"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period = ReportService.resolve_date_range(preset=preset, custom_start=start_date, custom_end=end_date)
    return ReportService.get_salary_report(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        labour_id=labour_id,
        payment_status=payment_status,
        period=period,
    )


# =============================================================================
# 6. Fertilizer and Pesticide Report
# =============================================================================

@reports_router.get(
    "/fertilizer-pesticide",
    response_model=FertilizerPesticideReportData,
    summary="Fertilizer & Pesticide Application Report",
)
def get_fertilizer_pesticide_report(
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID"),
    field_id: Optional[UUID] = Query(None, description="Optional field ID"),
    crop_id: Optional[UUID] = Query(None, description="Optional crop ID"),
    category: Optional[str] = Query(None, description="fertilizer or pesticide"),
    preset: Optional[str] = Query(None, description="Date preset"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period = ReportService.resolve_date_range(preset=preset, custom_start=start_date, custom_end=end_date)
    return ReportService.get_fertilizer_pesticide_report(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        field_id=field_id,
        crop_id=crop_id,
        category=category,
        period=period,
    )


# =============================================================================
# 7. Irrigation Report
# =============================================================================

@reports_router.get(
    "/irrigation",
    response_model=IrrigationReportData,
    summary="Irrigation & Water Management Report",
)
def get_irrigation_report(
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID"),
    field_id: Optional[UUID] = Query(None, description="Optional field ID"),
    preset: Optional[str] = Query(None, description="Date preset"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period = ReportService.resolve_date_range(preset=preset, custom_start=start_date, custom_end=end_date)
    return ReportService.get_irrigation_report(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        field_id=field_id,
        period=period,
    )


# =============================================================================
# 8. Expense Report
# =============================================================================

@reports_router.get(
    "/expenses",
    response_model=ExpenseReportData,
    summary="Farm Operational Expense Report",
)
def get_expense_report(
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID"),
    field_id: Optional[UUID] = Query(None, description="Optional field ID"),
    category: Optional[str] = Query(None, description="Expense category"),
    payment_status: Optional[str] = Query(None, description="Payment status"),
    preset: Optional[str] = Query(None, description="Date preset"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period = ReportService.resolve_date_range(preset=preset, custom_start=start_date, custom_end=end_date)
    return ReportService.get_expense_report(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        field_id=field_id,
        category=category,
        payment_status=payment_status,
        period=period,
    )


# =============================================================================
# 9. Machinery and Equipment Report
# =============================================================================

@reports_router.get(
    "/machinery",
    response_model=MachineryReportData,
    summary="Machinery & Equipment Asset Report",
)
def get_machinery_report(
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID"),
    operational_status: Optional[str] = Query(None, description="Operational status"),
    condition: Optional[str] = Query(None, description="Physical condition"),
    preset: Optional[str] = Query(None, description="Date preset"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period = ReportService.resolve_date_range(preset=preset, custom_start=start_date, custom_end=end_date)
    return ReportService.get_machinery_report(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        operational_status=operational_status,
        condition=condition,
        period=period,
    )


# =============================================================================
# 10. Harvest Report
# =============================================================================

@reports_router.get(
    "/harvest",
    response_model=HarvestReportData,
    summary="Crop Harvest & Yield Report",
)
def get_harvest_report(
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID"),
    field_id: Optional[UUID] = Query(None, description="Optional field ID"),
    crop_id: Optional[UUID] = Query(None, description="Optional crop ID"),
    quality_grade: Optional[str] = Query(None, description="Quality grade"),
    preset: Optional[str] = Query(None, description="Date preset"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period = ReportService.resolve_date_range(preset=preset, custom_start=start_date, custom_end=end_date)
    return ReportService.get_harvest_report(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        field_id=field_id,
        crop_id=crop_id,
        quality_grade=quality_grade,
        period=period,
    )


# =============================================================================
# 11. Sales and Income Report
# =============================================================================

@reports_router.get(
    "/sales-income",
    response_model=SalesIncomeReportData,
    summary="Sales & Farm Income Report",
)
def get_sales_income_report(
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID"),
    crop_id: Optional[UUID] = Query(None, description="Optional crop ID"),
    payment_status: Optional[str] = Query(None, description="Payment status"),
    preset: Optional[str] = Query(None, description="Date preset"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period = ReportService.resolve_date_range(preset=preset, custom_start=start_date, custom_end=end_date)
    return ReportService.get_sales_income_report(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        crop_id=crop_id,
        payment_status=payment_status,
        period=period,
    )


# =============================================================================
# 12. Financial Summary Report
# =============================================================================

@reports_router.get(
    "/financial-summary",
    response_model=FinancialSummaryReportData,
    summary="Authoritative Financial Summary & Profit/Loss Statement",
)
def get_financial_summary_report(
    farm_id: Optional[UUID] = Query(None, description="Optional farm ID"),
    preset: Optional[str] = Query(None, description="Date preset"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period = ReportService.resolve_date_range(preset=preset, custom_start=start_date, custom_end=end_date)
    return ReportService.get_financial_summary_report(
        db=db,
        user_id=current_user.id,
        farm_id=farm_id,
        period=period,
    )


# =============================================================================
# Export Endpoints (PDF & Excel)
# =============================================================================

@reports_router.get(
    "/export/pdf",
    summary="Export Report as PDF Document",
    description="Compiles requested report dataset into a formatted printable PDF file.",
)
def export_report_pdf(
    category: ReportCategory = Query(ReportCategory.FINANCIAL_SUMMARY, description="Report category"),
    farm_id: Optional[UUID] = Query(None, description="Farm ID"),
    field_id: Optional[UUID] = Query(None, description="Field ID"),
    crop_id: Optional[UUID] = Query(None, description="Crop ID"),
    labour_id: Optional[UUID] = Query(None, description="Labour ID"),
    expense_category: Optional[str] = Query(None, description="Expense or chemical category"),
    status: Optional[str] = Query(None, description="Status filter"),
    preset: Optional[str] = Query(None, description="Date preset"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate and stream PDF report binary."""
    report = ReportService.generate_unified_report(
        db=db,
        user_id=current_user.id,
        category=category,
        farm_id=farm_id,
        field_id=field_id,
        crop_id=crop_id,
        labour_id=labour_id,
        expense_category=expense_category,
        status_filter=status,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
    )
    pdf_bytes = PDFExportService.generate_pdf(report)
    filename = f"{category.value}_report_{date.today().strftime('%Y%m%d')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@reports_router.get(
    "/export/excel",
    summary="Export Report as Excel (.xlsx) Spreadsheet",
    description="Compiles requested report dataset into a formatted Excel spreadsheet.",
)
def export_report_excel(
    category: ReportCategory = Query(ReportCategory.FINANCIAL_SUMMARY, description="Report category"),
    farm_id: Optional[UUID] = Query(None, description="Farm ID"),
    field_id: Optional[UUID] = Query(None, description="Field ID"),
    crop_id: Optional[UUID] = Query(None, description="Crop ID"),
    labour_id: Optional[UUID] = Query(None, description="Labour ID"),
    expense_category: Optional[str] = Query(None, description="Expense or chemical category"),
    status: Optional[str] = Query(None, description="Status filter"),
    preset: Optional[str] = Query(None, description="Date preset"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate and stream Excel spreadsheet binary."""
    report = ReportService.generate_unified_report(
        db=db,
        user_id=current_user.id,
        category=category,
        farm_id=farm_id,
        field_id=field_id,
        crop_id=crop_id,
        labour_id=labour_id,
        expense_category=expense_category,
        status_filter=status,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
    )
    excel_bytes = ExcelExportService.generate_excel(report)
    filename = f"{category.value}_report_{date.today().strftime('%Y%m%d')}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )

