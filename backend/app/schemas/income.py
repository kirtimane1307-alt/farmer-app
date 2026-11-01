"""Pydantic schemas for Phase 15: Other Farm Income Management."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.models.income import INCOME_CATEGORIES, INCOME_CATEGORY_LABELS


class IncomeBase(BaseModel):
    """Base fields for other non-crop farm income."""

    income_date: date = Field(..., description="Date of income receipt")
    category: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Category classification (e.g. government_subsidy, equipment_rental, etc.)",
    )
    description: str = Field(
        ..., min_length=1, max_length=255, description="Clear description of income reason"
    )
    amount: Decimal = Field(
        ..., gt=0, description="Monetary income received (strictly positive)"
    )
    source: Optional[str] = Field(
        None, max_length=150, description="Payer, agency, department, or client name"
    )
    payment_method: Optional[str] = Field(
        default="cash", max_length=50, description="Collection method"
    )
    reference_number: Optional[str] = Field(
        None, max_length=100, description="Cheque/NEFT/transaction tracking number"
    )
    notes: Optional[str] = Field(
        None, max_length=2000, description="Additional context or notes"
    )

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0"):
            raise ValueError("Income amount must be strictly greater than zero.")
        return v.quantize(Decimal("0.01"))

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not cleaned:
            raise ValueError("Income category cannot be empty.")
        return cleaned


class IncomeCreate(IncomeBase):
    """Payload to record new other farm income."""

    farm_id: UUID = Field(..., description="Target farm estate identifier")


class IncomeUpdate(BaseModel):
    """Payload to modify an existing other income record."""

    farm_id: Optional[UUID] = None
    income_date: Optional[date] = None
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(None, gt=0)
    source: Optional[str] = Field(None, max_length=150)
    payment_method: Optional[str] = Field(None, max_length=50)
    reference_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            if v <= Decimal("0"):
                raise ValueError("Income amount must be strictly greater than zero.")
            return v.quantize(Decimal("0.01"))
        return None


class IncomeResponse(IncomeBase):
    """Response representation of an other income record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farm_id: UUID
    farm_name: Optional[str] = None
    category_label: str = ""
    created_at: datetime
    updated_at: datetime


class CategoryIncomeBreakdown(BaseModel):
    """Category-wise income breakdown item."""

    category: str
    category_label: str
    total_amount: Decimal
    percentage: Decimal
    count: int


class IncomeSummaryResponse(BaseModel):
    """Aggregate summary of other farm income."""

    total_income: Decimal
    total_count: int
    top_category: Optional[str] = None
    category_breakdown: List[CategoryIncomeBreakdown] = []


class IncomeDeleteResponse(BaseModel):
    """Confirmation payload returned when an income record is deleted."""

    id: UUID
    deleted: bool = True
    message: str
