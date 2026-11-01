"""Produce Sales service implementing financial calculations, multi-tenant isolation, and payment ledgers."""

import logging
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import Session, joinedload

from app.models.farm import Farm
from app.models.field import Field
from app.models.crop import Crop
from app.models.harvest import Harvest
from app.models.sale import Sale, SalePayment, SALE_PAYMENT_STATUSES, SALE_PAYMENT_METHODS
from app.schemas.sale import (
    SaleCreate,
    SaleUpdate,
    SaleResponse,
    SalePaymentCreate,
    SalePaymentResponse,
    SaleSummaryResponse,
    CropSalesSummary,
    SaleDeleteResponse,
)

logger = logging.getLogger("farm-management.sale-service")


class SaleService:
    """Service layer managing produce sales transactions and payment receipts."""

    @staticmethod
    def _validate_farm_ownership(db: Session, farm_id: UUID, user_id: UUID) -> Farm:
        """Verify that the target farm exists and is owned by the authenticated user."""
        farm = (
            db.query(Farm)
            .filter(and_(Farm.id == farm_id, Farm.user_id == user_id))
            .first()
        )
        if not farm:
            logger.warning(
                f"Unauthorized or nonexistent farm access: farm_id={farm_id}, user_id={user_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farm not found or you do not have permission to access it.",
            )
        return farm

    @staticmethod
    def _validate_hierarchy(
        db: Session,
        farm_id: UUID,
        field_id: Optional[UUID],
        crop_id: Optional[UUID],
        harvest_id: Optional[UUID],
    ) -> Tuple[Optional[Field], Optional[Crop], Optional[Harvest]]:
        """
        Validate relational consistency between farm, field, crop, and harvest.
        Infers missing relationships where unambiguous.
        """
        field_obj: Optional[Field] = None
        crop_obj: Optional[Crop] = None
        harvest_obj: Optional[Harvest] = None

        if harvest_id:
            harvest_obj = db.query(Harvest).filter(Harvest.id == harvest_id).first()
            if not harvest_obj:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Harvest record with ID {harvest_id} not found.",
                )
            if harvest_obj.farm_id != farm_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Specified harvest does not belong to the selected farm.",
                )
            if crop_id and harvest_obj.crop_id != crop_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Specified harvest does not match the selected crop.",
                )
            crop_id = harvest_obj.crop_id
            field_id = harvest_obj.field_id

        if crop_id:
            crop_obj = (
                db.query(Crop)
                .join(Field, Crop.field_id == Field.id)
                .filter(and_(Crop.id == crop_id, Field.farm_id == farm_id))
                .first()
            )
            if not crop_obj:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Crop with ID {crop_id} does not belong to the selected farm.",
                )
            if field_id and crop_obj.field_id != field_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Crop does not belong to the specified field {field_id}.",
                )
            field_id = crop_obj.field_id

        if field_id:
            field_obj = (
                db.query(Field)
                .filter(and_(Field.id == field_id, Field.farm_id == farm_id))
                .first()
            )
            if not field_obj:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field plot {field_id} does not belong to the selected farm.",
                )

        return field_obj, crop_obj, harvest_obj

    @classmethod
    def _generate_sale_number(cls, db: Session, sale_date: date) -> str:
        """Generate a clean, collision-free sale reference code (e.g. SALE-202610-0001)."""
        date_str = sale_date.strftime("%Y%m")
        prefix = f"SALE-{date_str}-"
        count = db.query(Sale).filter(Sale.sale_number.like(f"{prefix}%")).count()
        candidate = f"{prefix}{count + 1:04d}"
        # Check collision
        while db.query(Sale).filter(Sale.sale_number == candidate).first():
            count += 1
            candidate = f"{prefix}{count + 1:04d}"
        return candidate

    @classmethod
    def _populate_sale_response(cls, sale: Sale) -> SaleResponse:
        """Assemble fully populated response model with relational entity names."""
        payments = [
            SalePaymentResponse.model_validate(p) for p in (sale.payments or [])
        ]

        return SaleResponse(
            id=sale.id,
            farm_id=sale.farm_id,
            farm_name=sale.farm.name if sale.farm else None,
            field_id=sale.field_id,
            field_name=sale.field.name if sale.field else None,
            crop_id=sale.crop_id,
            crop_name=sale.crop.name if sale.crop else None,
            crop_variety=sale.crop.variety if sale.crop else None,
            harvest_id=sale.harvest_id,
            harvest_batch_number=sale.harvest.batch_number if sale.harvest else None,
            sale_number=sale.sale_number,
            sale_date=sale.sale_date,
            buyer_name=sale.buyer_name,
            buyer_phone=sale.buyer_phone,
            buyer_address=sale.buyer_address,
            product_name=sale.product_name,
            quantity=sale.quantity,
            unit=sale.unit,
            unit_price=sale.unit_price,
            gross_amount=sale.gross_amount,
            discount_amount=sale.discount_amount,
            total_amount=sale.total_amount,
            amount_paid=sale.amount_paid,
            outstanding_amount=sale.outstanding_amount,
            payment_status=sale.payment_status,
            payment_method=sale.payment_method,
            notes=sale.notes,
            created_at=sale.created_at,
            updated_at=sale.updated_at,
            payments=payments,
        )

    @classmethod
    def create_sale(
        cls, db: Session, user_id: UUID, payload: SaleCreate
    ) -> SaleResponse:
        """Create a new produce sale with authoritative backend financial calculation."""
        # 1. Validate target farm ownership
        farm = cls._validate_farm_ownership(db, payload.farm_id, user_id)

        # 2. Validate hierarchy
        field_obj, crop_obj, harvest_obj = cls._validate_hierarchy(
            db,
            payload.farm_id,
            payload.field_id,
            payload.crop_id,
            payload.harvest_id,
        )

        resolved_field_id = field_obj.id if field_obj else payload.field_id
        resolved_crop_id = crop_obj.id if crop_obj else payload.crop_id
        resolved_harvest_id = harvest_obj.id if harvest_obj else payload.harvest_id

        # 3. Calculate financial totals
        gross_amount = (payload.quantity * payload.unit_price).quantize(Decimal("0.01"))
        discount = (payload.discount_amount or Decimal("0.00")).quantize(Decimal("0.01"))

        if discount > gross_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Discount amount ({discount} INR) cannot exceed gross sale amount ({gross_amount} INR).",
            )

        total_amount = (gross_amount - discount).quantize(Decimal("0.01"))

        # Initial payment handling
        initial_payment = payload.initial_payment_amount or Decimal("0.00")
        if initial_payment < Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Initial payment amount cannot be negative.",
            )

        if initial_payment > total_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Initial payment ({initial_payment} INR) cannot exceed total sale payable "
                    f"amount ({total_amount} INR)."
                ),
            )

        amount_paid = initial_payment.quantize(Decimal("0.01"))
        outstanding_amount = (total_amount - amount_paid).quantize(Decimal("0.01"))

        if amount_paid == Decimal("0.00"):
            payment_status = "unpaid"
        elif amount_paid >= total_amount:
            payment_status = "paid"
        else:
            payment_status = "partially_paid"

        # 4. Generate or validate sale_number
        if payload.sale_number and payload.sale_number.strip():
            sale_num = payload.sale_number.strip()
            existing = db.query(Sale).filter(Sale.sale_number == sale_num).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Sale number '{sale_num}' already exists in the system.",
                )
        else:
            sale_num = cls._generate_sale_number(db, payload.sale_date)

        # 5. Build and save Sale
        sale = Sale(
            farm_id=payload.farm_id,
            field_id=resolved_field_id,
            crop_id=resolved_crop_id,
            harvest_id=resolved_harvest_id,
            created_by_id=user_id,
            sale_number=sale_num,
            sale_date=payload.sale_date,
            buyer_name=payload.buyer_name.strip(),
            buyer_phone=payload.buyer_phone.strip() if payload.buyer_phone else None,
            buyer_address=payload.buyer_address.strip() if payload.buyer_address else None,
            product_name=payload.product_name.strip(),
            quantity=payload.quantity,
            unit=payload.unit.strip().lower(),
            unit_price=payload.unit_price,
            gross_amount=gross_amount,
            discount_amount=discount,
            total_amount=total_amount,
            amount_paid=amount_paid,
            outstanding_amount=outstanding_amount,
            payment_status=payment_status,
            payment_method=payload.payment_method or ("cash" if initial_payment > 0 else None),
            notes=payload.notes.strip() if payload.notes else None,
        )
        db.add(sale)
        db.flush()

        # 6. If initial payment provided, record sale payment receipt
        if initial_payment > Decimal("0.00"):
            payment_record = SalePayment(
                sale_id=sale.id,
                amount=amount_paid,
                payment_date=payload.sale_date,
                payment_method=payload.payment_method or "cash",
                reference_number=payload.reference_number,
                notes="Initial upfront payment recorded with sale creation.",
            )
            db.add(payment_record)

        db.commit()
        db.refresh(sale)
        logger.info(
            f"Created produce sale {sale.id} ({sale.sale_number}) for farm {farm.name} by user {user_id}"
        )
        return cls._populate_sale_response(sale)

    @classmethod
    def list_sales(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        crop_id: Optional[UUID] = None,
        harvest_id: Optional[UUID] = None,
        payment_status: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[SaleResponse]:
        """Query multi-criteria filtered sales belonging to authorized user."""
        query = (
            db.query(Sale)
            .join(Farm, Sale.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
            .options(
                joinedload(Sale.farm),
                joinedload(Sale.field),
                joinedload(Sale.crop),
                joinedload(Sale.harvest),
                joinedload(Sale.payments),
            )
        )

        if farm_id:
            query = query.filter(Sale.farm_id == farm_id)
        if field_id:
            query = query.filter(Sale.field_id == field_id)
        if crop_id:
            query = query.filter(Sale.crop_id == crop_id)
        if harvest_id:
            query = query.filter(Sale.harvest_id == harvest_id)
        if payment_status:
            query = query.filter(Sale.payment_status == payment_status.strip().lower())
        if start_date:
            query = query.filter(Sale.sale_date >= start_date)
        if end_date:
            query = query.filter(Sale.sale_date <= end_date)
        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Sale.sale_number.ilike(term),
                    Sale.buyer_name.ilike(term),
                    Sale.product_name.ilike(term),
                    Sale.notes.ilike(term),
                )
            )

        sales = (
            query.order_by(desc(Sale.sale_date), desc(Sale.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [cls._populate_sale_response(s) for s in sales]

    @classmethod
    def get_sale_by_id(cls, db: Session, sale_id: UUID, user_id: UUID) -> SaleResponse:
        """Fetch single sale with tenant access enforcement."""
        sale = (
            db.query(Sale)
            .join(Farm, Sale.farm_id == Farm.id)
            .filter(and_(Sale.id == sale_id, Farm.user_id == user_id))
            .options(
                joinedload(Sale.farm),
                joinedload(Sale.field),
                joinedload(Sale.crop),
                joinedload(Sale.harvest),
                joinedload(Sale.payments),
            )
            .first()
        )
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sale record not found or access unauthorized.",
            )
        return cls._populate_sale_response(sale)

    @classmethod
    def update_sale(
        cls, db: Session, sale_id: UUID, user_id: UUID, payload: SaleUpdate
    ) -> SaleResponse:
        """Update an existing produce sale and recalculate financial balances."""
        sale = (
            db.query(Sale)
            .join(Farm, Sale.farm_id == Farm.id)
            .filter(and_(Sale.id == sale_id, Farm.user_id == user_id))
            .options(
                joinedload(Sale.farm),
                joinedload(Sale.field),
                joinedload(Sale.crop),
                joinedload(Sale.harvest),
                joinedload(Sale.payments),
            )
            .first()
        )
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sale record not found or access unauthorized.",
            )

        # Update scalar text fields
        if payload.sale_date is not None:
            sale.sale_date = payload.sale_date
        if payload.buyer_name is not None:
            sale.buyer_name = payload.buyer_name.strip()
        if payload.buyer_phone is not None:
            sale.buyer_phone = payload.buyer_phone.strip() or None
        if payload.buyer_address is not None:
            sale.buyer_address = payload.buyer_address.strip() or None
        if payload.product_name is not None:
            sale.product_name = payload.product_name.strip()
        if payload.unit is not None:
            sale.unit = payload.unit.strip().lower()
        if payload.payment_method is not None:
            sale.payment_method = payload.payment_method
        if payload.notes is not None:
            sale.notes = payload.notes.strip() or None

        # Check if financial numbers changed
        new_quantity = payload.quantity if payload.quantity is not None else sale.quantity
        new_unit_price = payload.unit_price if payload.unit_price is not None else sale.unit_price
        new_discount = payload.discount_amount if payload.discount_amount is not None else sale.discount_amount

        new_gross = (new_quantity * new_unit_price).quantize(Decimal("0.01"))
        if new_discount > new_gross:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Discount ({new_discount}) cannot exceed gross amount ({new_gross} INR).",
            )

        new_total = (new_gross - new_discount).quantize(Decimal("0.01"))

        # Crucial: New total amount cannot be less than already recorded payments
        if new_total < sale.amount_paid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"New total amount ({new_total} INR) cannot be less than already collected "
                    f"payments ({sale.amount_paid} INR)."
                ),
            )

        sale.quantity = new_quantity
        sale.unit_price = new_unit_price
        sale.gross_amount = new_gross
        sale.discount_amount = new_discount
        sale.total_amount = new_total
        sale.outstanding_amount = (new_total - sale.amount_paid).quantize(Decimal("0.01"))

        if sale.amount_paid == Decimal("0.00"):
            sale.payment_status = "unpaid"
        elif sale.amount_paid >= sale.total_amount:
            sale.payment_status = "paid"
        else:
            sale.payment_status = "partially_paid"

        db.commit()
        db.refresh(sale)
        logger.info(f"Updated sale {sale.id} ({sale.sale_number}) by user {user_id}")
        return cls._populate_sale_response(sale)

    @classmethod
    def delete_sale(
        cls, db: Session, sale_id: UUID, user_id: UUID
    ) -> SaleDeleteResponse:
        """
        Safely delete a sale record.
        Rejects deletion if payments have already been received to preserve audit trails.
        """
        sale = (
            db.query(Sale)
            .join(Farm, Sale.farm_id == Farm.id)
            .filter(and_(Sale.id == sale_id, Farm.user_id == user_id))
            .first()
        )
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sale record not found or access unauthorized.",
            )

        if sale.amount_paid > Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot delete sale with recorded customer payments ({sale.amount_paid} INR). "
                    "Financial audit records must be preserved."
                ),
            )

        sale_num = sale.sale_number
        db.delete(sale)
        db.commit()
        logger.info(f"Deleted unpaid sale record {sale_id} ({sale_num}) by user {user_id}")
        return SaleDeleteResponse(
            id=sale_id,
            deleted=True,
            message=f"Sale '{sale_num}' was successfully deleted.",
        )

    # ==========================================
    # Payment Ledger Operations
    # ==========================================

    @classmethod
    def list_sale_payments(
        cls, db: Session, sale_id: UUID, user_id: UUID
    ) -> List[SalePaymentResponse]:
        """Retrieve payment history for a given authorized sale."""
        sale = (
            db.query(Sale)
            .join(Farm, Sale.farm_id == Farm.id)
            .filter(and_(Sale.id == sale_id, Farm.user_id == user_id))
            .first()
        )
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sale record not found or access unauthorized.",
            )

        payments = (
            db.query(SalePayment)
            .filter(SalePayment.sale_id == sale_id)
            .order_by(desc(SalePayment.payment_date), desc(SalePayment.created_at))
            .all()
        )
        return [SalePaymentResponse.model_validate(p) for p in payments]

    @classmethod
    def create_sale_payment(
        cls, db: Session, sale_id: UUID, user_id: UUID, payload: SalePaymentCreate
    ) -> SalePaymentResponse:
        """Record an installment or full settlement payment against an authorized sale."""
        sale = (
            db.query(Sale)
            .join(Farm, Sale.farm_id == Farm.id)
            .filter(and_(Sale.id == sale_id, Farm.user_id == user_id))
            .with_for_update()
            .first()
        )
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sale record not found or access unauthorized.",
            )

        payment_amount = payload.amount.quantize(Decimal("0.01"))
        if payment_amount <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount must be strictly positive.",
            )

        if payment_amount > sale.outstanding_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Payment amount ({payment_amount} INR) exceeds outstanding balance "
                    f"({sale.outstanding_amount} INR). Overpayments are not supported."
                ),
            )

        payment = SalePayment(
            sale_id=sale.id,
            amount=payment_amount,
            payment_date=payload.payment_date,
            payment_method=payload.payment_method,
            reference_number=payload.reference_number.strip() if payload.reference_number else None,
            notes=payload.notes.strip() if payload.notes else None,
        )
        db.add(payment)
        db.flush()

        # Recalculate amount_paid from all recorded payments
        total_paid = (
            db.query(func.coalesce(func.sum(SalePayment.amount), Decimal("0.00")))
            .filter(SalePayment.sale_id == sale.id)
            .scalar()
        )
        sale.amount_paid = Decimal(str(total_paid)).quantize(Decimal("0.01"))
        sale.outstanding_amount = (sale.total_amount - sale.amount_paid).quantize(Decimal("0.01"))

        if sale.amount_paid >= sale.total_amount:
            sale.payment_status = "paid"
        elif sale.amount_paid > Decimal("0.00"):
            sale.payment_status = "partially_paid"
        else:
            sale.payment_status = "unpaid"

        db.commit()
        db.refresh(payment)
        logger.info(
            f"Recorded payment of {payment_amount} INR for sale {sale.sale_number} "
            f"(new status='{sale.payment_status}', remaining balance={sale.outstanding_amount})"
        )
        return SalePaymentResponse.model_validate(payment)

    @classmethod
    def delete_sale_payment(
        cls, db: Session, sale_id: UUID, payment_id: UUID, user_id: UUID
    ) -> SaleDeleteResponse:
        """Remove a payment entry and adjust the sale balance accordingly."""
        sale = (
            db.query(Sale)
            .join(Farm, Sale.farm_id == Farm.id)
            .filter(and_(Sale.id == sale_id, Farm.user_id == user_id))
            .with_for_update()
            .first()
        )
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sale record not found or access unauthorized.",
            )

        payment = (
            db.query(SalePayment)
            .filter(and_(SalePayment.id == payment_id, SalePayment.sale_id == sale_id))
            .first()
        )
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment record not found.",
            )

        amount_removed = payment.amount
        db.delete(payment)
        db.flush()

        # Recalculate remaining payments
        total_paid = (
            db.query(func.coalesce(func.sum(SalePayment.amount), Decimal("0.00")))
            .filter(SalePayment.sale_id == sale.id)
            .scalar()
        )
        sale.amount_paid = Decimal(str(total_paid)).quantize(Decimal("0.01"))
        sale.outstanding_amount = (sale.total_amount - sale.amount_paid).quantize(Decimal("0.01"))

        if sale.amount_paid >= sale.total_amount and sale.total_amount > Decimal("0.00"):
            sale.payment_status = "paid"
        elif sale.amount_paid > Decimal("0.00"):
            sale.payment_status = "partially_paid"
        else:
            sale.payment_status = "unpaid"

        db.commit()
        logger.info(
            f"Deleted payment {payment_id} ({amount_removed} INR) from sale {sale.sale_number} by user {user_id}"
        )
        return SaleDeleteResponse(
            id=payment_id,
            deleted=True,
            message=f"Payment record of {amount_removed} INR successfully deleted.",
        )

    # ==========================================
    # Summary & Metrics
    # ==========================================

    @classmethod
    def get_sales_summary(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        crop_id: Optional[UUID] = None,
        payment_status: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> SaleSummaryResponse:
        """Calculate authoritative decimal produce sales performance metrics."""
        query = (
            db.query(Sale)
            .join(Farm, Sale.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )

        if farm_id:
            query = query.filter(Sale.farm_id == farm_id)
        if crop_id:
            query = query.filter(Sale.crop_id == crop_id)
        if payment_status:
            query = query.filter(Sale.payment_status == payment_status.strip().lower())
        if start_date:
            query = query.filter(Sale.sale_date >= start_date)
        if end_date:
            query = query.filter(Sale.sale_date <= end_date)

        sales = query.options(joinedload(Sale.crop)).all()

        total_sales_count = len(sales)
        total_revenue = Decimal("0.00")
        total_gross = Decimal("0.00")
        total_discount = Decimal("0.00")
        total_received = Decimal("0.00")
        total_outstanding = Decimal("0.00")
        total_quantity_sold = Decimal("0.00")

        paid_count = 0
        partially_paid_count = 0
        unpaid_count = 0

        crop_stats: Dict[str, Dict[str, Any]] = {}
        buyer_stats: Dict[str, Decimal] = {}

        for s in sales:
            total_revenue += s.total_amount
            total_gross += s.gross_amount
            total_discount += s.discount_amount
            total_received += s.amount_paid
            total_outstanding += s.outstanding_amount
            total_quantity_sold += s.quantity

            if s.payment_status == "paid":
                paid_count += 1
            elif s.payment_status == "partially_paid":
                partially_paid_count += 1
            else:
                unpaid_count += 1

            # Crop breakdown
            c_name = s.crop.name if s.crop else s.product_name
            c_var = s.crop.variety if s.crop else None
            key = f"{c_name}::{s.unit}"
            if key not in crop_stats:
                crop_stats[key] = {
                    "crop_name": c_name,
                    "variety": c_var,
                    "sales_count": 0,
                    "quantity_sold": Decimal("0.00"),
                    "unit": s.unit,
                    "total_revenue": Decimal("0.00"),
                }
            crop_stats[key]["sales_count"] += 1
            crop_stats[key]["quantity_sold"] += s.quantity
            crop_stats[key]["total_revenue"] += s.total_amount

            # Buyer totals
            b_name = s.buyer_name
            buyer_stats[b_name] = buyer_stats.get(b_name, Decimal("0.00")) + s.total_amount

        top_buyer = None
        if buyer_stats:
            top_buyer = max(buyer_stats.items(), key=lambda x: x[1])[0]

        top_crop = None
        if crop_stats:
            top_crop = max(crop_stats.values(), key=lambda x: x["total_revenue"])["crop_name"]

        breakdown = [
            CropSalesSummary(
                crop_name=item["crop_name"],
                variety=item["variety"],
                sales_count=item["sales_count"],
                quantity_sold=item["quantity_sold"],
                unit=item["unit"],
                total_revenue=item["total_revenue"],
            )
            for item in sorted(
                crop_stats.values(), key=lambda x: x["total_revenue"], reverse=True
            )
        ]

        return SaleSummaryResponse(
            total_sales_count=total_sales_count,
            total_revenue=total_revenue.quantize(Decimal("0.01")),
            total_gross=total_gross.quantize(Decimal("0.01")),
            total_discount=total_discount.quantize(Decimal("0.01")),
            total_received=total_received.quantize(Decimal("0.01")),
            total_outstanding=total_outstanding.quantize(Decimal("0.01")),
            total_quantity_sold=total_quantity_sold.quantize(Decimal("0.01")),
            paid_count=paid_count,
            partially_paid_count=partially_paid_count,
            unpaid_count=unpaid_count,
            top_buyer=top_buyer,
            top_crop=top_crop,
            sales_by_crop=breakdown,
        )
