"""Expense Pydantic schemas for request validation, financial accuracy, and response serialization."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Any, Dict
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.models.expense import EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS


VALID_PAYMENT_STATUSES = ("unpaid", "partially_paid", "paid")
VALID_PAYMENT_METHODS = ("cash", "bank_transfer", "upi", "cheque", "card", "other")


def normalize_category_str(v: Any) -> str:
    """Normalize user-entered category strings to canonical snake_case."""
    if not isinstance(v, str):
        raise ValueError("Category must be a string")
    clean = (
        v.strip()
        .lower()
        .replace("&", "and")
        .replace("-", "_")
        .replace("/", "_")
        .replace(" ", "_")
    )
    # Handle duplicate underscores if any
    while "__" in clean:
        clean = clean.replace("__", "_")
    
    if clean in EXPENSE_CATEGORIES:
        return clean
    raise ValueError(
        f"Invalid expense category '{v}'. Supported categories: {', '.join(EXPENSE_CATEGORIES)}"
    )


def normalize_payment_method_str(v: Any) -> Optional[str]:
    """Normalize payment method string."""
    if v is None:
        return None
    if not isinstance(v, str):
        raise ValueError("Payment method must be a string")
    clean = (
        v.strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )
    if clean in VALID_PAYMENT_METHODS:
        return clean
    raise ValueError(
        f"Invalid payment method '{v}'. Supported methods: {', '.join(VALID_PAYMENT_METHODS)}"
    )


class ExpensePaymentBase(BaseModel):
    """Shared fields for an individual expense payment disbursement."""
    amount: Decimal = Field(..., gt=0, description="Payment amount in INR (must be > 0)")
    payment_date: date = Field(..., description="Date on which payment was disbursed")
    payment_method: str = Field(
        default="cash",
        description="Payment mode ('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other')",
    )
    transaction_reference: Optional[str] = Field(
        None, max_length=100, description="Optional bank / UPI transaction reference ID"
    )
    notes: Optional[str] = Field(None, max_length=1000, description="Optional notes or remarks")

    @field_validator("payment_method", mode="before")
    @classmethod
    def validate_payment_method(cls, v: Any) -> str:
        clean = normalize_payment_method_str(v)
        return clean or "cash"


class ExpensePaymentCreate(ExpensePaymentBase):
    """Schema for recording a payment disbursement against an outstanding expense."""
    pass


class ExpensePaymentResponse(ExpensePaymentBase):
    """Serialized expense payment record."""
    id: UUID
    expense_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExpenseBase(BaseModel):
    """Core attributes for an Expense record."""
    category: str = Field(..., description="Expense category")
    title: str = Field(..., min_length=1, max_length=200, description="Short title/name of the expense")
    description: Optional[str] = Field(None, description="Detailed description of the expenditure")
    amount: Decimal = Field(..., gt=0, description="Total expense amount in INR (must be > 0)")
    expense_date: date = Field(..., description="Date when expense was incurred")
    payment_method: Optional[str] = Field(None, description="Initial or intended payment method")
    vendor_name: Optional[str] = Field(None, max_length=150, description="Supplier or service vendor name")
    invoice_number: Optional[str] = Field(None, max_length=100, description="Bill or invoice number")
    transaction_reference: Optional[str] = Field(None, max_length=100, description="Transaction reference ID")
    notes: Optional[str] = Field(None, max_length=2000, description="Additional context or notes")

    @field_validator("category", mode="before")
    @classmethod
    def validate_category(cls, v: Any) -> str:
        return normalize_category_str(v)

    @field_validator("payment_method", mode="before")
    @classmethod
    def validate_optional_payment_method(cls, v: Any) -> Optional[str]:
        return normalize_payment_method_str(v)

    @field_validator("title")
    @classmethod
    def validate_non_blank_title(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Expense title cannot be blank")
        return v.strip()


class ExpenseCreate(ExpenseBase):
    """Schema for registering a new expense."""
    farm_id: UUID = Field(..., description="Target farm estate UUID")
    field_id: Optional[UUID] = Field(None, description="Optional subdivided field plot UUID")
    crop_id: Optional[UUID] = Field(None, description="Optional cultivated crop cycle UUID")
    payment_status: Optional[str] = Field(
        "unpaid",
        description="Payment status ('unpaid', 'partially_paid', or 'paid')",
    )
    initial_payment: Optional[bool] = Field(
        False,
        description="If True or payment_status=='paid', creates an initial payment disbursement equal to amount",
    )

    @field_validator("payment_status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> str:
        if v is None:
            return "unpaid"
        clean = str(v).strip().lower()
        if clean in VALID_PAYMENT_STATUSES:
            return clean
        raise ValueError(
            f"Invalid payment status '{v}'. Must be one of: {', '.join(VALID_PAYMENT_STATUSES)}"
        )


class ExpenseUpdate(BaseModel):
    """Schema for modifying an existing expense."""
    farm_id: Optional[UUID] = None
    field_id: Optional[UUID] = None
    crop_id: Optional[UUID] = None
    category: Optional[str] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    expense_date: Optional[date] = None
    payment_method: Optional[str] = None
    vendor_name: Optional[str] = Field(None, max_length=150)
    invoice_number: Optional[str] = Field(None, max_length=100)
    transaction_reference: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("category", mode="before")
    @classmethod
    def validate_opt_category(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        return normalize_category_str(v)

    @field_validator("payment_method", mode="before")
    @classmethod
    def validate_opt_payment_method(cls, v: Any) -> Optional[str]:
        return normalize_payment_method_str(v)


class ExpenseResponse(ExpenseBase):
    """Serialized expense record with relational metadata and payment history."""
    id: UUID
    farm_id: UUID
    farm_name: Optional[str] = None
    field_id: Optional[UUID] = None
    field_name: Optional[str] = None
    crop_id: Optional[UUID] = None
    crop_name: Optional[str] = None
    category_label: str
    amount_paid: Decimal
    outstanding_balance: Decimal
    payment_status: str
    created_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    payments: List[ExpensePaymentResponse] = []

    model_config = ConfigDict(from_attributes=True)


class CategoryBreakdownItem(BaseModel):
    """Breakdown of expense totals per category."""
    category: str
    category_label: str
    total_amount: Decimal
    percentage: float
    count: int


class HighestCategoryInfo(BaseModel):
    """Highest expenditure category."""
    category: str
    category_label: str
    total_amount: Decimal


class ExpenseSummaryResponse(BaseModel):
    """Authoritative expense summary totals and category breakdown."""
    total_expenses: Decimal
    total_paid: Decimal
    total_unpaid: Decimal
    total_partially_paid: Decimal
    expense_count: int
    paid_count: int
    unpaid_count: int
    partially_paid_count: int
    highest_category: Optional[HighestCategoryInfo] = None
    category_breakdown: List[CategoryBreakdownItem] = []


class ExpenseDeleteResponse(BaseModel):
    """Response envelope for expense deletion."""
    id: UUID
    deleted: bool = True
    message: str
