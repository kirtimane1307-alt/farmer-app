"""Pydantic schemas for Phase 18: Reports Management.

Defines schemas for all 12 report categories, filtering parameters,
overview statistics, export metadata, and table structures.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class ReportCategory(str, Enum):
    """Authoritative list of the 12 supported report categories."""

    FARM_SUMMARY = "farm_summary"
    CROP = "crop"
    LABOUR = "labour"
    ATTENDANCE = "attendance"
    SALARY = "salary"
    FERTILIZER_PESTICIDE = "fertilizer_pesticide"
    IRRIGATION = "irrigation"
    EXPENSE = "expense"
    MACHINERY = "machinery"
    HARVEST = "harvest"
    SALES_INCOME = "sales_income"
    FINANCIAL_SUMMARY = "financial_summary"


class DateRangePreset(str, Enum):
    """Standardized date range presets for report filtering."""

    TODAY = "today"
    LAST_7_DAYS = "last_7_days"
    LAST_30_DAYS = "last_30_days"
    THIS_MONTH = "this_month"
    PREVIOUS_MONTH = "previous_month"
    THIS_YEAR = "this_year"
    CUSTOM = "custom"
    ALL_TIME = "all_time"


class ReportingPeriod(BaseModel):
    """Metadata describing the active time boundary for a report."""

    label: str = Field(..., description="Human-readable period descriptor (e.g., 'Oct 2026', 'Last 30 Days')")
    start_date: Optional[date] = Field(None, description="Starting calendar date of reporting range")
    end_date: Optional[date] = Field(None, description="Ending calendar date of reporting range")
    preset: Optional[str] = Field(None, description="Preset identifier if applicable")


class ReportMetadata(BaseModel):
    """Standard header metadata attached to every generated report."""

    report_category: str = Field(..., description="Report category code")
    report_title: str = Field(..., description="Display title of the report")
    farm_id: Optional[UUID] = Field(None, description="Specific farm ID if filtered, None for all farms")
    farm_name: str = Field(..., description="Target farm name or 'All Registered Farms'")
    period: ReportingPeriod = Field(..., description="Reporting time boundaries")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Report generation timestamp")
    total_records: int = Field(default=0, description="Total count of data rows returned")


# =====================================================================
# Overview Statistics Schema
# =====================================================================

class ReportsOverviewResponse(BaseModel):
    """Summary dashboard cards displayed on the top of the Reports page."""

    total_categories: int = Field(default=12, description="Total number of supported report categories")
    available_farms_count: int = Field(default=0, description="Total farms owned by current user")
    total_fields_count: int = Field(default=0, description="Total cultivated field plots")
    active_crops_count: int = Field(default=0, description="Active growing crops count")
    total_labour_count: int = Field(default=0, description="Total registered workforce")
    
    # Authoritative financial summary (Phase 15 / 17 exact logic)
    total_sales_revenue: Decimal = Field(default=Decimal("0.00"), description="Total produce sales after discount")
    total_other_income: Decimal = Field(default=Decimal("0.00"), description="Total auxiliary income")
    total_income: Decimal = Field(default=Decimal("0.00"), description="Total gross income (Sales + Other Income)")
    total_expenses: Decimal = Field(default=Decimal("0.00"), description="Total operational expenses")
    recorded_profit_loss: Decimal = Field(default=Decimal("0.00"), description="Net Profit/Loss (Income - Expenses)")
    is_profit: bool = Field(default=True, description="True if profitable, False if net loss")
    profit_margin_percentage: Decimal = Field(default=Decimal("0.00"), description="Profit margin %")


# =====================================================================
# 1. Farm Summary Report Schema
# =====================================================================

class FarmFieldDetail(BaseModel):
    id: UUID
    name: str
    area: Decimal
    area_unit: str
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None
    active_crops_count: int = 0
    active_crops_names: List[str] = Field(default_factory=list)


class FarmSummaryItem(BaseModel):
    farm_id: UUID
    farm_name: str
    location: str
    total_area: Decimal
    area_unit: str
    total_fields: int
    cultivated_area: Decimal
    active_crops_count: int
    active_crops: List[str] = Field(default_factory=list)
    total_workers: int = 0
    total_activities_count: int = 0
    fields: List[FarmFieldDetail] = Field(default_factory=list)


class FarmSummaryReportData(BaseModel):
    metadata: ReportMetadata
    farms: List[FarmSummaryItem] = Field(default_factory=list)
    summary: Dict[str, Any] = Field(default_factory=dict)


# =====================================================================
# 2. Crop Report Schema
# =====================================================================

class CropReportItem(BaseModel):
    crop_id: UUID
    crop_name: str
    variety: str
    season: Optional[str] = None
    farm_id: UUID
    farm_name: str
    field_id: UUID
    field_name: str
    sowing_date: date
    expected_harvest_date: Optional[date] = None
    actual_harvest_date: Optional[date] = None
    status: str
    planted_area: Optional[Decimal] = None
    planted_area_unit: str = "acres"
    seed_quantity: Optional[Decimal] = None
    seed_unit: Optional[str] = "kg"
    harvest_yield: Optional[Decimal] = None
    harvest_unit: Optional[str] = None
    notes: Optional[str] = None


class CropReportData(BaseModel):
    metadata: ReportMetadata
    items: List[CropReportItem] = Field(default_factory=list)
    total_crops: int = 0
    total_planted_area: Decimal = Decimal("0.00")
    active_crops_count: int = 0
    harvested_crops_count: int = 0
    status_breakdown: Dict[str, int] = Field(default_factory=dict)


# =====================================================================
# 3. Labour Report Schema
# =====================================================================

class LabourReportItem(BaseModel):
    labour_id: UUID
    name: str
    phone: Optional[str] = None
    work_type: str
    daily_wage: Decimal
    joining_date: date
    status: str
    farm_id: UUID
    farm_name: str
    total_working_days: int = 0
    total_working_hours: Decimal = Decimal("0.00")
    present_days: int = 0
    absent_days: int = 0
    half_days: int = 0
    leave_days: int = 0
    attendance_rate: Decimal = Decimal("0.00")
    total_salary_earned: Decimal = Decimal("0.00")
    total_salary_paid: Decimal = Decimal("0.00")
    outstanding_balance: Decimal = Decimal("0.00")


class LabourReportData(BaseModel):
    metadata: ReportMetadata
    items: List[LabourReportItem] = Field(default_factory=list)
    total_workers: int = 0
    active_workers: int = 0
    total_wages_earned: Decimal = Decimal("0.00")
    total_wages_paid: Decimal = Decimal("0.00")
    total_wages_outstanding: Decimal = Decimal("0.00")


# =====================================================================
# 4. Attendance Report Schema
# =====================================================================

class AttendanceReportItem(BaseModel):
    attendance_id: UUID
    labour_id: UUID
    worker_name: str
    farm_id: UUID
    farm_name: str
    work_type: str
    attendance_date: date
    status: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    working_minutes: int = 0
    working_hours: Decimal = Decimal("0.00")
    overtime_minutes: int = 0
    notes: Optional[str] = None


class AttendanceReportData(BaseModel):
    metadata: ReportMetadata
    items: List[AttendanceReportItem] = Field(default_factory=list)
    total_records: int = 0
    present_count: int = 0
    absent_count: int = 0
    half_day_count: int = 0
    leave_count: int = 0
    overall_attendance_rate: Decimal = Decimal("0.00")
    total_working_hours: Decimal = Decimal("0.00")


# =====================================================================
# 5. Salary and Payment Report Schema
# =====================================================================

class SalaryReportItem(BaseModel):
    salary_record_id: UUID
    labour_id: UUID
    worker_name: str
    farm_id: UUID
    farm_name: str
    period_start: date
    period_end: date
    daily_wage_snapshot: Decimal
    present_days: Decimal
    half_days: int
    absent_days: int
    gross_salary: Decimal
    deductions: Decimal
    net_salary: Decimal
    amount_paid: Decimal
    outstanding_balance: Decimal
    status: str
    last_payment_date: Optional[date] = None
    notes: Optional[str] = None


class SalaryReportData(BaseModel):
    metadata: ReportMetadata
    items: List[SalaryReportItem] = Field(default_factory=list)
    total_salary_earned: Decimal = Decimal("0.00")
    total_amount_paid: Decimal = Decimal("0.00")
    total_outstanding_amount: Decimal = Decimal("0.00")
    paid_records_count: int = 0
    pending_records_count: int = 0


# =====================================================================
# 6. Fertilizer and Pesticide Report Schema
# =====================================================================

class FertilizerPesticideReportItem(BaseModel):
    application_id: UUID
    product_name: str
    application_category: str
    product_type: str
    quantity: Decimal
    unit: str
    unit_cost: Optional[Decimal] = None
    total_cost: Optional[Decimal] = None
    application_date: date
    application_method: Optional[str] = None
    purpose: Optional[str] = None
    farm_id: UUID
    farm_name: str
    field_id: UUID
    field_name: str
    crop_id: Optional[UUID] = None
    crop_name: Optional[str] = None
    notes: Optional[str] = None


class FertilizerPesticideReportData(BaseModel):
    metadata: ReportMetadata
    items: List[FertilizerPesticideReportItem] = Field(default_factory=list)
    total_applications: int = 0
    fertilizer_applications_count: int = 0
    pesticide_applications_count: int = 0
    total_expenditure: Decimal = Decimal("0.00")
    fertilizer_expenditure: Decimal = Decimal("0.00")
    pesticide_expenditure: Decimal = Decimal("0.00")


# =====================================================================
# 7. Irrigation Report Schema
# =====================================================================

class IrrigationReportItem(BaseModel):
    event_id: UUID
    farm_id: UUID
    farm_name: str
    field_id: Optional[UUID] = None
    field_name: Optional[str] = None
    crop_id: Optional[UUID] = None
    crop_name: Optional[str] = None
    irrigation_date: date
    irrigation_method: str
    duration_minutes: Optional[int] = None
    duration_hours: Optional[Decimal] = None
    water_usage_litres: Optional[Decimal] = None
    status: str
    notes: Optional[str] = None


class IrrigationReportData(BaseModel):
    metadata: ReportMetadata
    items: List[IrrigationReportItem] = Field(default_factory=list)
    total_irrigation_sessions: int = 0
    total_duration_hours: Decimal = Decimal("0.00")
    total_water_usage_litres: Optional[Decimal] = None
    fields_covered_count: int = 0


# =====================================================================
# 8. Expense Report Schema
# =====================================================================

class ExpenseCategorySummary(BaseModel):
    category: str
    category_label: str
    total_amount: Decimal
    percentage: Decimal
    count: int


class ExpenseReportItem(BaseModel):
    expense_id: UUID
    title: str
    category: str
    category_label: str
    amount: Decimal
    amount_paid: Decimal
    outstanding_balance: Decimal
    expense_date: date
    payment_status: str
    payment_method: Optional[str] = None
    vendor_name: Optional[str] = None
    farm_id: UUID
    farm_name: str
    field_id: Optional[UUID] = None
    field_name: Optional[str] = None
    notes: Optional[str] = None


class ExpenseReportData(BaseModel):
    metadata: ReportMetadata
    items: List[ExpenseReportItem] = Field(default_factory=list)
    total_expenses: Decimal = Decimal("0.00")
    total_paid: Decimal = Decimal("0.00")
    total_outstanding: Decimal = Decimal("0.00")
    category_summaries: List[ExpenseCategorySummary] = Field(default_factory=list)


# =====================================================================
# 9. Machinery and Equipment Report Schema
# =====================================================================

class MachineryReportItem(BaseModel):
    model_config = {"protected_namespaces": ()}

    equipment_id: UUID
    equipment_name: str
    equipment_type: str
    brand: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    operational_status: str
    condition: str
    fuel_type: Optional[str] = None
    farm_id: UUID
    farm_name: str
    field_id: Optional[UUID] = None
    field_name: Optional[str] = None
    last_service_date: Optional[date] = None
    next_service_date: Optional[date] = None
    maintenance_count: int = 0
    total_maintenance_cost: Decimal = Decimal("0.00")
    notes: Optional[str] = None


class MachineryReportData(BaseModel):
    metadata: ReportMetadata
    items: List[MachineryReportItem] = Field(default_factory=list)
    total_equipment: int = 0
    available_count: int = 0
    under_maintenance_count: int = 0
    retired_count: int = 0
    total_asset_value: Decimal = Decimal("0.00")
    total_maintenance_expenditure: Decimal = Decimal("0.00")


# =====================================================================
# 10. Harvest Report Schema
# =====================================================================

class HarvestReportItem(BaseModel):
    harvest_id: UUID
    crop_id: UUID
    crop_name: str
    variety: str
    farm_id: UUID
    farm_name: str
    field_id: UUID
    field_name: str
    harvest_date: date
    quantity: Decimal
    unit: str
    quality_grade: str
    harvest_method: Optional[str] = None
    storage_location: Optional[str] = None
    batch_number: Optional[str] = None
    notes: Optional[str] = None


class HarvestReportData(BaseModel):
    metadata: ReportMetadata
    items: List[HarvestReportItem] = Field(default_factory=list)
    total_harvests: int = 0
    total_yield_by_unit: Dict[str, Decimal] = Field(default_factory=dict)
    quality_distribution: Dict[str, int] = Field(default_factory=dict)


# =====================================================================
# 11. Sales and Income Report Schema
# =====================================================================

class SalesIncomeReportItem(BaseModel):
    entry_id: UUID
    entry_type: str  # "produce_sale" or "other_income"
    reference_number: Optional[str] = None
    item_name: str  # Crop produce name or Income category
    transaction_date: date
    buyer_or_source: str
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    selling_price: Optional[Decimal] = None
    discount: Optional[Decimal] = None
    final_amount: Decimal
    amount_paid: Decimal
    outstanding_amount: Decimal
    payment_status: str
    payment_method: Optional[str] = None
    farm_id: UUID
    farm_name: str
    notes: Optional[str] = None


class SalesIncomeReportData(BaseModel):
    metadata: ReportMetadata
    items: List[SalesIncomeReportItem] = Field(default_factory=list)
    total_sales_revenue: Decimal = Decimal("0.00")
    total_other_income: Decimal = Decimal("0.00")
    total_gross_income: Decimal = Decimal("0.00")
    total_received: Decimal = Decimal("0.00")
    total_outstanding_receivables: Decimal = Decimal("0.00")
    produce_sales_count: int = 0
    other_income_count: int = 0


# =====================================================================
# 12. Financial Summary Report Schema
# =====================================================================

class MonthlyFinancialSummaryItem(BaseModel):
    month_key: str
    month_label: str
    sales_revenue: Decimal
    other_income: Decimal
    total_income: Decimal
    expenses: Decimal
    net_profit_loss: Decimal
    is_profit: bool
    profit_margin_percentage: Decimal


class FinancialSummaryReportData(BaseModel):
    metadata: ReportMetadata
    total_sales_revenue: Decimal = Decimal("0.00")
    total_other_income: Decimal = Decimal("0.00")
    total_income: Decimal = Decimal("0.00")
    total_expenses: Decimal = Decimal("0.00")
    recorded_profit_loss: Decimal = Decimal("0.00")
    is_profit: bool = True
    profit_margin_percentage: Decimal = Decimal("0.00")

    total_sales_received: Decimal = Decimal("0.00")
    outstanding_receivables: Decimal = Decimal("0.00")
    total_expenses_paid: Decimal = Decimal("0.00")
    outstanding_payables: Decimal = Decimal("0.00")

    sales_count: int = 0
    income_count: int = 0
    expenses_count: int = 0

    monthly_breakdown: List[MonthlyFinancialSummaryItem] = Field(default_factory=list)
    expense_category_breakdown: List[ExpenseCategorySummary] = Field(default_factory=list)


# =====================================================================
# Unified Report Response Wrapper (for preview / polymorphic view)
# =====================================================================

class UnifiedReportResponse(BaseModel):
    """Container returned by the unified report preview endpoint."""

    metadata: ReportMetadata
    category: ReportCategory
    summary_cards: Dict[str, Any] = Field(default_factory=dict)
    table_headers: List[str] = Field(default_factory=list)
    table_rows: List[Dict[str, Any]] = Field(default_factory=list)
    data: Optional[Any] = None
