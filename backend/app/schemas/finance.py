"""Pydantic schemas for Phase 15: Financial Summary & Profit/Loss Reporting."""

from datetime import date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class MonthlyFinancialRecord(BaseModel):
    """Monthly financial performance record comparing revenue against expenses."""

    month: str = Field(..., description="Month key in YYYY-MM format")
    month_label: str = Field(..., description="Human readable month label (e.g. Oct 2026)")
    sales_revenue: Decimal = Field(default=Decimal("0.00"), description="Produce sales revenue (after discounts)")
    other_income: Decimal = Field(default=Decimal("0.00"), description="Other farm income")
    total_income: Decimal = Field(default=Decimal("0.00"), description="Total revenue (sales + other income)")
    total_expenses: Decimal = Field(default=Decimal("0.00"), description="Total recorded farm operating expenses")
    net_profit_loss: Decimal = Field(default=Decimal("0.00"), description="Net recorded profit or loss")
    is_profit: bool = Field(default=True, description="True if net profit >= 0, False if loss")


class FinancialSummaryResponse(BaseModel):
    """
    Authoritative farm financial overview and profit/loss calculation.
    Combines produce sales, other farm income, and recorded farm expenses.
    """

    # High-level totals
    total_sales_revenue: Decimal = Field(
        ..., description="Total produce sales value (gross amount less discounts)"
    )
    total_other_income: Decimal = Field(
        ..., description="Total non-crop farm income (subsidies, rentals, etc.)"
    )
    total_income: Decimal = Field(
        ..., description="Total revenue (Sales Revenue + Other Income)"
    )
    total_expenses: Decimal = Field(
        ..., description="Total farm operating expenses recorded in the period"
    )
    net_profit_loss: Decimal = Field(
        ..., description="Net financial outcome (Total Income - Total Expenses)"
    )
    is_profit: bool = Field(
        ..., description="True if operating in profit, False if net loss"
    )
    profit_margin_percentage: Decimal = Field(
        default=Decimal("0.00"),
        description="Recorded profit margin percentage (Net Profit / Total Income * 100)",
    )

    # Cash flow and credit receivables / payables
    total_sales_received: Decimal = Field(
        ..., description="Total cash collected from produce sales"
    )
    outstanding_receivables: Decimal = Field(
        ..., description="Uncollected balances owed by customers/buyers"
    )
    total_expenses_paid: Decimal = Field(
        ..., description="Disbursed payments for farm operating costs"
    )
    outstanding_payables: Decimal = Field(
        ..., description="Pending payments owed to suppliers/vendors"
    )

    # Counts & volumes
    total_sales_count: int = Field(..., description="Number of sales recorded in period")
    total_income_count: int = Field(..., description="Number of other income entries")
    total_expenses_count: int = Field(..., description="Number of expense entries")

    # Time series & breakdowns
    monthly_breakdown: List[MonthlyFinancialRecord] = Field(
        default_factory=list, description="Month-by-month financial timeline"
    )

    # Filtering context & disclaimer
    farm_id: Optional[UUID] = None
    farm_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    disclaimer: str = (
        "Recorded income minus recorded expenses. Figures reflect current operational "
        "ledgers and do not include depreciation, inventory valuation adjustments, "
        "or unrecorded tax liabilities."
    )
