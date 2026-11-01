"""Salary and Payment Pydantic schemas for request validation and response serialization."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Literal, List, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator


VALID_SALARY_STATUSES = ("draft", "generated", "partially_paid", "paid")
SalaryStatusType = Literal["draft", "generated", "partially_paid", "paid"]

VALID_PAYMENT_METHODS = ("cash", "bank_transfer", "upi", "cheque", "other")
PaymentMethodType = Literal["cash", "bank_transfer", "upi", "cheque", "other"]


class SalaryPeriodBase(BaseModel):
    """Base date period with chronological validation."""
    period_start: date = Field(..., description="Salary start date (inclusive)")
    period_end: date = Field(..., description="Salary end date (inclusive)")

    @field_validator("period_end")
    @classmethod
    def validate_period_chronology(cls, v: date, info) -> date:
        data = info.data
        if "period_start" in data and data["period_start"] and v < data["period_start"]:
            raise ValueError("Salary period end date cannot be earlier than start date.")
        return v


class SalaryPreviewRequest(SalaryPeriodBase):
    """Payload to request an authoritative preview calculation without saving."""
    labour_id: UUID = Field(..., description="Target agricultural worker UUID")
    approved_overtime_pay: Optional[Decimal] = Field(
        default=Decimal("0.00"),
        ge=0,
        description="Explicitly approved overtime pay in INR (defaults to 0.00)",
    )
    additional_earnings: Optional[Decimal] = Field(
        default=Decimal("0.00"),
        ge=0,
        description="Optional bonuses or allowances in INR (defaults to 0.00)",
    )
    deductions: Optional[Decimal] = Field(
        default=Decimal("0.00"),
        ge=0,
        description="Optional wage deductions/advances in INR (defaults to 0.00)",
    )
    notes: Optional[str] = Field(None, max_length=2000, description="Optional administrative notes")


class AttendanceBreakdown(BaseModel):
    """Summary of worker attendance metrics in the calculation period."""
    total_days_in_period: int
    attendance_records_count: int
    present_days: Decimal
    half_days: int
    absent_days: int
    leave_days: int
    unmarked_days: int
    payable_units: Decimal
    total_overtime_minutes: int
    total_overtime_hours_formatted: str


class SalaryPreviewResponse(BaseModel):
    """Comprehensive preview breakdown returned for user verification before persisting."""
    labour_id: UUID
    labour_name: str
    farm_id: UUID
    farm_name: str
    work_type: Optional[str] = None
    period_start: date
    period_end: date

    daily_wage_snapshot: Decimal
    attendance: AttendanceBreakdown

    # Financial components
    regular_salary: Decimal
    approved_overtime_pay: Decimal
    additional_earnings: Decimal
    deductions: Decimal
    gross_salary: Decimal
    net_salary: Decimal
    amount_paid: Decimal = Decimal("0.00")
    outstanding_balance: Decimal
    status: str = "draft"
    notes: Optional[str] = None

    calculation_policy: str
    is_already_generated: bool = False
    existing_salary_id: Optional[UUID] = None


class SalaryCreate(SalaryPeriodBase):
    """Payload to generate and persist a permanent salary record."""
    labour_id: UUID = Field(..., description="Target agricultural worker UUID")
    approved_overtime_pay: Optional[Decimal] = Field(
        default=Decimal("0.00"),
        ge=0,
        description="Explicitly approved overtime compensation (defaults to 0.00)",
    )
    additional_earnings: Optional[Decimal] = Field(
        default=Decimal("0.00"),
        ge=0,
        description="Optional bonuses or allowances (defaults to 0.00)",
    )
    deductions: Optional[Decimal] = Field(
        default=Decimal("0.00"),
        ge=0,
        description="Optional deductions or advances (defaults to 0.00)",
    )
    notes: Optional[str] = Field(None, max_length=2000, description="Optional administrative notes")


class SalaryUpdate(BaseModel):
    """Payload to adjust deductions, additional earnings, or notes on an existing salary."""
    approved_overtime_pay: Optional[Decimal] = Field(None, ge=0)
    additional_earnings: Optional[Decimal] = Field(None, ge=0)
    deductions: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=2000)


class PaymentCreate(BaseModel):
    """Payload to disburse a partial or full salary payment."""
    amount: Decimal = Field(..., gt=0, description="Payment disbursement amount in INR (must be > 0)")
    payment_date: date = Field(..., description="Date of transaction disbursement")
    payment_method: PaymentMethodType = Field(
        default="cash",
        description="Payment mode ('cash', 'bank_transfer', 'upi', 'cheque', 'other')",
    )
    transaction_reference: Optional[str] = Field(
        None,
        max_length=100,
        description="Optional bank reference, UPI transaction ID, or cheque number",
    )
    notes: Optional[str] = Field(None, max_length=2000, description="Optional remarks or receipt notes")

    @field_validator("payment_method", mode="before")
    @classmethod
    def normalize_payment_method(cls, v: Any) -> str:
        if isinstance(v, str):
            clean = v.strip().lower().replace(" ", "_").replace("-", "_")
            if clean in VALID_PAYMENT_METHODS:
                return clean
        raise ValueError(
            f"Invalid payment method. Must be one of: {', '.join(VALID_PAYMENT_METHODS)}"
        )


class PaymentResponse(BaseModel):
    """Serialized salary payment ledger item."""
    id: UUID
    salary_record_id: UUID
    amount: Decimal
    payment_date: date
    payment_method: str
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SalaryResponse(BaseModel):
    """Complete serialized salary ledger record with embedded payment history."""
    id: UUID
    labour_id: UUID
    labour_name: Optional[str] = None
    farm_id: UUID
    farm_name: Optional[str] = None
    period_start: date
    period_end: date

    daily_wage_snapshot: Decimal
    present_days: Decimal
    half_days: int
    absent_days: int
    leave_days: int
    payable_units: Decimal

    regular_salary: Decimal
    overtime_pay: Decimal
    additional_earnings: Decimal
    deductions: Decimal
    gross_salary: Decimal
    net_salary: Decimal
    amount_paid: Decimal
    outstanding_balance: Decimal
    status: str
    notes: Optional[str] = None
    calculation_metadata: Optional[str] = None

    payments: List[PaymentResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SalarySummaryResponse(BaseModel):
    """Aggregate statistics for salary dashboard."""
    total_salary_payable: Decimal
    total_amount_paid: Decimal
    total_outstanding_balance: Decimal
    paid_records_count: int
    partially_paid_records_count: int
    unpaid_records_count: int
    total_records_count: int


class SalaryDeleteResponse(BaseModel):
    """Envelope for salary record deletion."""
    id: UUID
    deleted: bool = True
    message: str
