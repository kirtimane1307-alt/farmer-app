"""Pydantic schemas for Phase 15: Produce Sales and Sales Payment Management."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.models.sale import SALE_PAYMENT_STATUSES, SALE_PAYMENT_METHODS


# ==========================================
# Sales Payment Schemas
# ==========================================


class SalePaymentBase(BaseModel):
    """Base fields for a sale payment disbursement record."""

    amount: Decimal = Field(..., gt=0, description="Payment installment amount received")
    payment_date: date = Field(..., description="Date payment was collected")
    payment_method: str = Field(
        default="cash",
        description="Payment mode ('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other')",
    )
    reference_number: Optional[str] = Field(
        None, max_length=100, description="Cheque/NEFT/UPI reference ID"
    )
    notes: Optional[str] = Field(
        None, max_length=1000, description="Payment collection notes"
    )

    @field_validator("amount")
    @classmethod
    def validate_payment_amount(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0"):
            raise ValueError("Payment amount must be greater than zero.")
        return v.quantize(Decimal("0.01"))

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if cleaned not in SALE_PAYMENT_METHODS:
            raise ValueError(
                f"Invalid payment method '{v}'. Must be one of: {', '.join(SALE_PAYMENT_METHODS)}"
            )
        return cleaned


class SalePaymentCreate(SalePaymentBase):
    """Payload for recording a customer payment against an authorized sale."""
    pass


class SalePaymentResponse(SalePaymentBase):
    """Response representation of an individual payment transaction."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sale_id: UUID
    created_at: datetime
    updated_at: datetime


# ==========================================
# Produce Sales Schemas
# ==========================================


class SaleBase(BaseModel):
    """Base fields for a produce sale transaction."""

    sale_date: date = Field(..., description="Date of transaction")
    buyer_name: str = Field(
        ..., min_length=1, max_length=150, description="Buyer or purchasing customer name"
    )
    buyer_phone: Optional[str] = Field(
        None, max_length=50, description="Buyer contact telephone number"
    )
    buyer_address: Optional[str] = Field(
        None, max_length=255, description="Buyer delivery or billing address"
    )
    product_name: str = Field(
        ..., min_length=1, max_length=150, description="Produce or crop product sold"
    )
    quantity: Decimal = Field(
        ..., gt=0, description="Quantity of produce sold (strictly positive)"
    )
    unit: str = Field(
        default="kg", min_length=1, max_length=30, description="Unit of measurement (e.g. kg, quintals, tonnes, bags, crates)"
    )
    unit_price: Decimal = Field(
        ..., ge=0, description="Agreed unit selling price"
    )
    discount_amount: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        description="Discount applied to total sale amount",
    )
    payment_method: Optional[str] = Field(
        None, max_length=50, description="Primary payment mode"
    )
    notes: Optional[str] = Field(
        None, max_length=2000, description="Additional commercial terms or notes"
    )

    @field_validator("quantity")
    @classmethod
    def validate_positive_quantity(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0"):
            raise ValueError("Sale quantity must be strictly greater than zero.")
        return v.quantize(Decimal("0.01"))

    @field_validator("unit_price")
    @classmethod
    def validate_unit_price(cls, v: Decimal) -> Decimal:
        if v < Decimal("0"):
            raise ValueError("Unit price cannot be negative.")
        return v.quantize(Decimal("0.01"))

    @field_validator("discount_amount")
    @classmethod
    def validate_discount(cls, v: Decimal) -> Decimal:
        if v < Decimal("0"):
            raise ValueError("Discount amount cannot be negative.")
        return v.quantize(Decimal("0.01"))

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Measurement unit cannot be empty.")
        return cleaned.lower()


class SaleCreate(SaleBase):
    """Payload to create a new produce sale."""

    farm_id: UUID = Field(..., description="Target farm estate identifier")
    field_id: Optional[UUID] = Field(
        None, description="Optional field plot from which produce originated"
    )
    crop_id: Optional[UUID] = Field(
        None, description="Optional crop cycle linked to this sale"
    )
    harvest_id: Optional[UUID] = Field(
        None, description="Optional harvest record linked to this sale"
    )
    sale_number: Optional[str] = Field(
        None, max_length=60, description="Custom sale reference; auto-generated if omitted"
    )

    # Optional upfront payment details
    initial_payment_amount: Optional[Decimal] = Field(
        default=None,
        ge=0,
        description="Upfront payment received at the time of sale recording",
    )
    reference_number: Optional[str] = Field(
        None, max_length=100, description="Payment transaction reference"
    )

    @field_validator("initial_payment_amount")
    @classmethod
    def validate_initial_payment(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            if v < Decimal("0"):
                raise ValueError("Initial payment amount cannot be negative.")
            return v.quantize(Decimal("0.01"))
        return None


class SaleUpdate(BaseModel):
    """Payload to modify an existing sale record."""

    sale_date: Optional[date] = None
    buyer_name: Optional[str] = Field(None, min_length=1, max_length=150)
    buyer_phone: Optional[str] = Field(None, max_length=50)
    buyer_address: Optional[str] = Field(None, max_length=255)
    product_name: Optional[str] = Field(None, min_length=1, max_length=150)
    quantity: Optional[Decimal] = Field(None, gt=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=30)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    discount_amount: Optional[Decimal] = Field(None, ge=0)
    payment_method: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("quantity")
    @classmethod
    def validate_qty(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            if v <= Decimal("0"):
                raise ValueError("Sale quantity must be strictly greater than zero.")
            return v.quantize(Decimal("0.01"))
        return None

    @field_validator("unit_price")
    @classmethod
    def validate_price(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            if v < Decimal("0"):
                raise ValueError("Unit price cannot be negative.")
            return v.quantize(Decimal("0.01"))
        return None

    @field_validator("discount_amount")
    @classmethod
    def validate_disc(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            if v < Decimal("0"):
                raise ValueError("Discount cannot be negative.")
            return v.quantize(Decimal("0.01"))
        return None


class SaleResponse(SaleBase):
    """Detailed response representation of a sale record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farm_id: UUID
    farm_name: Optional[str] = None
    field_id: Optional[UUID] = None
    field_name: Optional[str] = None
    crop_id: Optional[UUID] = None
    crop_name: Optional[str] = None
    crop_variety: Optional[str] = None
    harvest_id: Optional[UUID] = None
    harvest_batch_number: Optional[str] = None

    sale_number: str
    gross_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    outstanding_amount: Decimal
    payment_status: str

    created_at: datetime
    updated_at: datetime
    payments: List[SalePaymentResponse] = []


class CropSalesSummary(BaseModel):
    """Produce/crop sales metrics breakdown."""

    crop_name: str
    variety: Optional[str] = None
    sales_count: int
    quantity_sold: Decimal
    unit: str
    total_revenue: Decimal


class SaleSummaryResponse(BaseModel):
    """Aggregated sales performance statistics for the authorized user."""

    total_sales_count: int
    total_revenue: Decimal
    total_gross: Decimal
    total_discount: Decimal
    total_received: Decimal
    total_outstanding: Decimal
    total_quantity_sold: Decimal
    paid_count: int
    partially_paid_count: int
    unpaid_count: int
    top_buyer: Optional[str] = None
    top_crop: Optional[str] = None
    sales_by_crop: List[CropSalesSummary] = []


class SaleDeleteResponse(BaseModel):
    """Confirmation payload returned when a sale is safely removed."""

    id: UUID
    deleted: bool = True
    message: str
