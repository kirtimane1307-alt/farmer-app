"""Pydantic schemas for Phase 17: Dashboard Analytics + Recharts."""

from datetime import date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class DashboardKpiSummary(BaseModel):
    """Core summary statistic cards for the farm management dashboard."""

    total_farms: int = Field(default=0, description="Total registered farms")
    total_fields: int = Field(default=0, description="Total cultivated field plots")
    active_crops: int = Field(default=0, description="Count of growing/active crop cycles")
    total_crops: int = Field(default=0, description="Total crop cycles registered")
    total_planted_area: Decimal = Field(default=Decimal("0.00"), description="Total planted acreage")
    
    total_labourers: int = Field(default=0, description="Total registered workforce")
    active_labourers: int = Field(default=0, description="Active workforce available on duty")
    present_today: int = Field(default=0, description="Labourers marked present today/in period")
    attendance_rate: Decimal = Field(default=Decimal("0.00"), description="Attendance percentage")
    total_working_hours: Decimal = Field(default=Decimal("0.00"), description="Total hours logged")
    total_working_hours_formatted: str = Field(default="0h", description="Formatted working hours")

    total_sales_revenue: Decimal = Field(default=Decimal("0.00"), description="Total produce sales after discount")
    total_other_income: Decimal = Field(default=Decimal("0.00"), description="Total auxiliary farm income")
    total_income: Decimal = Field(default=Decimal("0.00"), description="Total recorded income")
    total_expenses: Decimal = Field(default=Decimal("0.00"), description="Total recorded farm expenses")
    net_profit_loss: Decimal = Field(default=Decimal("0.00"), description="Net recorded profit or loss")
    is_profit: bool = Field(default=True, description="True if profitable, False if net loss")
    profit_margin_percentage: Decimal = Field(default=Decimal("0.00"), description="Profit margin percentage")


class DashboardFinancialOverview(BaseModel):
    """Detailed financial telemetry and calculated profit/loss statement."""

    total_sales_revenue: Decimal = Field(..., description="Produce sales revenue (after discounts)")
    total_other_income: Decimal = Field(..., description="Auxiliary non-crop farm income")
    total_income: Decimal = Field(..., description="Gross revenue (Sales + Other Income)")
    total_expenses: Decimal = Field(..., description="Total operating expenses")
    net_profit_loss: Decimal = Field(..., description="Net recorded profit/loss (Income - Expenses)")
    is_profit: bool = Field(..., description="True if operating in profit, False if net loss")
    profit_margin_percentage: Decimal = Field(default=Decimal("0.00"), description="Profit margin percentage")

    total_sales_received: Decimal = Field(..., description="Cash received from sales")
    outstanding_receivables: Decimal = Field(..., description="Uncollected balances owed by buyers")
    total_expenses_paid: Decimal = Field(..., description="Cash paid toward expenses")
    outstanding_payables: Decimal = Field(..., description="Unpaid operational liabilities")

    sales_transaction_count: int = Field(default=0, description="Number of sales recorded")
    income_transaction_count: int = Field(default=0, description="Number of other income entries")
    expense_transaction_count: int = Field(default=0, description="Number of expense records")


class IncomeExpenseTrendItem(BaseModel):
    """Comparative periodic financial record for Recharts line/bar visualization."""

    period: str = Field(..., description="Period identifier (YYYY-MM or YYYY-MM-DD)")
    period_label: str = Field(..., description="Formatted label (e.g. Oct 2026 or Oct 15)")
    sales_revenue: Decimal = Field(default=Decimal("0.00"), description="Produce sales revenue")
    other_income: Decimal = Field(default=Decimal("0.00"), description="Other auxiliary income")
    total_income: Decimal = Field(default=Decimal("0.00"), description="Total revenue")
    total_expenses: Decimal = Field(default=Decimal("0.00"), description="Operating expenses")
    net_profit_loss: Decimal = Field(default=Decimal("0.00"), description="Net profit or loss")
    is_profit: bool = Field(default=True, description="True if net profit >= 0")


class ExpenseCategoryItem(BaseModel):
    """Categorized operational expense for Recharts donut/pie breakdown."""

    category: str = Field(..., description="Internal category identifier")
    category_label: str = Field(..., description="Human-readable category label")
    amount: Decimal = Field(default=Decimal("0.00"), description="Total amount spent in category")
    percentage: Decimal = Field(default=Decimal("0.00"), description="Share of total expenses (0-100%)")
    transaction_count: int = Field(default=0, description="Number of expense items in category")


class AttendanceTrendItem(BaseModel):
    """Daily workforce attendance numbers for Recharts trend charts."""

    date: str = Field(..., description="Date string YYYY-MM-DD")
    date_label: str = Field(..., description="Formatted date label (e.g. Oct 19)")
    present: int = Field(default=0, description="Number of workers present")
    absent: int = Field(default=0, description="Number of workers absent")
    half_day: int = Field(default=0, description="Number of workers on half-day")
    leave: int = Field(default=0, description="Number of workers on approved leave")
    total_workers: int = Field(default=0, description="Total active roster size on date")
    total_working_hours: Decimal = Field(default=Decimal("0.00"), description="Working hours logged")


class CropDistributionItem(BaseModel):
    """Planted acreage and variety distribution for Recharts pie/bar charts."""

    crop_name: str = Field(..., description="Crop common name (e.g. Soybean, Alphonso Mango)")
    variety: str = Field(default="", description="Crop cultivar or variety")
    status: str = Field(default="growing", description="Crop lifecycle stage")
    planted_area: Decimal = Field(default=Decimal("0.00"), description="Cultivated land area")
    planted_area_unit: str = Field(default="Acres", description="Area measurement unit")
    field_count: int = Field(default=1, description="Number of field plots cultivated")
    percentage: Decimal = Field(default=Decimal("0.00"), description="Share of total cultivated land")


class HarvestTrendItem(BaseModel):
    """Crop harvest yield output over time for Recharts trend charts."""

    harvest_date: str = Field(..., description="Date string YYYY-MM-DD")
    date_label: str = Field(..., description="Formatted date label")
    crop_name: str = Field(..., description="Name of crop harvested")
    quantity: Decimal = Field(default=Decimal("0.00"), description="Yield quantity")
    unit: str = Field(default="kg", description="Weight or volume measurement unit")
    quality_grade: Optional[str] = Field(default="Standard", description="Quality grading")


class DashboardUpcomingActivity(BaseModel):
    """Upcoming scheduled farm operation loaded from Phase 16 Calendar."""

    id: UUID = Field(..., description="Event UUID")
    title: str = Field(..., description="Activity title")
    start_datetime: str = Field(..., description="Scheduled ISO start datetime")
    end_datetime: Optional[str] = Field(default=None, description="Scheduled ISO end datetime")
    activity_type: str = Field(..., description="Type of operation")
    status: str = Field(..., description="Status (planned/in_progress)")
    priority: str = Field(default="medium", description="Priority level (low/medium/high)")
    farm_id: UUID = Field(..., description="Associated farm UUID")
    farm_name: Optional[str] = Field(default=None, description="Resolved farm estate name")
    field_name: Optional[str] = Field(default=None, description="Resolved field plot name")
    crop_name: Optional[str] = Field(default=None, description="Resolved crop name")


class DashboardAnalyticsResponse(BaseModel):
    """Comprehensive consolidated dashboard analytics payload for Phase 17."""

    kpi: DashboardKpiSummary = Field(..., description="Top summary statistic cards")
    financial_overview: DashboardFinancialOverview = Field(..., description="Detailed P&L and cashflow")
    income_expense_trend: List[IncomeExpenseTrendItem] = Field(default_factory=list, description="Monthly/periodic financial trend")
    expense_breakdown: List[ExpenseCategoryItem] = Field(default_factory=list, description="Categorized expense breakdown")
    attendance_trend: List[AttendanceTrendItem] = Field(default_factory=list, description="Daily muster attendance trend")
    crop_distribution: List[CropDistributionItem] = Field(default_factory=list, description="Acreage allocation by crop")
    harvest_trend: List[HarvestTrendItem] = Field(default_factory=list, description="Yield harvest milestones over time")
    upcoming_activities: List[DashboardUpcomingActivity] = Field(default_factory=list, description="Scheduled upcoming calendar tasks")
    
    # Filter context echo
    selected_farm_id: Optional[UUID] = Field(default=None, description="Filtered farm UUID if any")
    selected_farm_name: Optional[str] = Field(default=None, description="Filtered farm estate name")
    start_date: Optional[date] = Field(default=None, description="Filter start date")
    end_date: Optional[date] = Field(default=None, description="Filter end date")
    period_label: str = Field(default="All Time", description="Human-readable date filter label")
