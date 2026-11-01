"""Expense service implementing financial validation, business rules, and multi-tenant ledger logic."""

import csv
import io
import logging
from datetime import date
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import Session, joinedload

from app.models.farm import Farm
from app.models.field import Field
from app.models.crop import Crop
from app.models.expense import Expense, ExpensePayment, EXPENSE_CATEGORY_LABELS
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpensePaymentCreate,
    ExpensePaymentResponse,
    ExpenseSummaryResponse,
    ExpenseDeleteResponse,
    CategoryBreakdownItem,
    HighestCategoryInfo,
)

logger = logging.getLogger("farm-management.expense-service")


class ExpenseService:
    """Service layer managing farm expenses and payment transactions."""

    @staticmethod
    def _validate_farm_ownership(db: Session, farm_id: UUID, user_id: UUID) -> Farm:
        """Verify that the target farm exists and belongs to the authenticated user."""
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
    def _validate_field_plot(db: Session, field_id: UUID, farm_id: UUID) -> Field:
        """Verify that the field exists and belongs to the specified farm."""
        field = (
            db.query(Field)
            .filter(and_(Field.id == field_id, Field.farm_id == farm_id))
            .first()
        )
        if not field:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Field plot {field_id} does not belong to the selected farm.",
            )
        return field

    @staticmethod
    def _validate_crop_cycle(
        db: Session, crop_id: UUID, farm_id: UUID, field_id: Optional[UUID]
    ) -> Crop:
        """Verify that the crop exists and belongs to the farm and field."""
        query = (
            db.query(Crop)
            .join(Field, Crop.field_id == Field.id)
            .filter(and_(Crop.id == crop_id, Field.farm_id == farm_id))
        )
        if field_id:
            query = query.filter(Crop.field_id == field_id)

        crop = query.first()
        if not crop:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Crop cycle {crop_id} does not belong to the specified farm or field.",
            )
        return crop

    @staticmethod
    def _to_response_dto(expense: Expense) -> ExpenseResponse:
        """Convert ORM Expense model into structured DTO with relational names and category labels."""
        category_label = EXPENSE_CATEGORY_LABELS.get(expense.category, expense.category.title())

        # Payments serialized
        payments_dto = [
            ExpensePaymentResponse.model_validate(p) for p in (expense.payments or [])
        ]

        return ExpenseResponse(
            id=expense.id,
            farm_id=expense.farm_id,
            farm_name=expense.farm.name if expense.farm else None,
            field_id=expense.field_id,
            field_name=expense.field.name if expense.field else None,
            crop_id=expense.crop_id,
            crop_name=expense.crop.name if expense.crop else None,
            category=expense.category,
            category_label=category_label,
            title=expense.title,
            description=expense.description,
            amount=expense.amount,
            amount_paid=expense.amount_paid,
            outstanding_balance=expense.outstanding_balance,
            expense_date=expense.expense_date,
            payment_status=expense.payment_status,
            payment_method=expense.payment_method,
            vendor_name=expense.vendor_name,
            invoice_number=expense.invoice_number,
            transaction_reference=expense.transaction_reference,
            notes=expense.notes,
            created_by_id=expense.created_by_id,
            created_at=expense.created_at,
            updated_at=expense.updated_at,
            payments=payments_dto,
        )

    @classmethod
    def create_expense(
        cls, db: Session, user_id: UUID, expense_in: ExpenseCreate
    ) -> ExpenseResponse:
        """
        Record a new farm expense with strict multi-tenant validation and atomic payment tracking.
        """
        # 1. Validate Farm ownership
        farm = cls._validate_farm_ownership(db=db, farm_id=expense_in.farm_id, user_id=user_id)

        # 2. Validate optional Field Plot
        if expense_in.field_id:
            cls._validate_field_plot(
                db=db, field_id=expense_in.field_id, farm_id=expense_in.farm_id
            )

        # 3. Validate optional Crop Cycle
        if expense_in.crop_id:
            cls._validate_crop_cycle(
                db=db,
                crop_id=expense_in.crop_id,
                farm_id=expense_in.farm_id,
                field_id=expense_in.field_id,
            )

        # 4. Determine initial payment status and disbursement
        should_pay_now = (
            expense_in.initial_payment or expense_in.payment_status == "paid"
        )
        if should_pay_now:
            amount_paid = expense_in.amount
            outstanding_balance = Decimal("0.00")
            payment_status = "paid"
        else:
            amount_paid = Decimal("0.00")
            outstanding_balance = expense_in.amount
            payment_status = "unpaid"

        # 5. Create Expense Record
        new_expense = Expense(
            farm_id=expense_in.farm_id,
            field_id=expense_in.field_id,
            crop_id=expense_in.crop_id,
            created_by_id=user_id,
            category=expense_in.category,
            title=expense_in.title,
            description=expense_in.description,
            amount=expense_in.amount,
            amount_paid=amount_paid,
            outstanding_balance=outstanding_balance,
            expense_date=expense_in.expense_date,
            payment_status=payment_status,
            payment_method=expense_in.payment_method,
            vendor_name=expense_in.vendor_name,
            invoice_number=expense_in.invoice_number,
            transaction_reference=expense_in.transaction_reference,
            notes=expense_in.notes,
        )

        db.add(new_expense)
        db.flush()  # obtain generated UUID

        # 6. If marked as paid upfront, record initial payment ledger entry
        if should_pay_now:
            initial_payment = ExpensePayment(
                expense_id=new_expense.id,
                amount=new_expense.amount,
                payment_date=new_expense.expense_date,
                payment_method=new_expense.payment_method or "cash",
                transaction_reference=new_expense.transaction_reference,
                notes="Initial payment upon expense creation",
            )
            db.add(initial_payment)

        db.commit()
        db.refresh(new_expense)

        logger.info(
            f"Created expense {new_expense.id} ('{new_expense.title}', {new_expense.amount} INR) "
            f"for farm '{farm.name}' by user {user_id}"
        )

        return cls._to_response_dto(new_expense)

    @classmethod
    def list_expenses(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        crop_id: Optional[UUID] = None,
        category: Optional[str] = None,
        payment_status: Optional[str] = None,
        vendor_name: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        search: Optional[str] = None,
    ) -> List[ExpenseResponse]:
        """
        List all farm expenses matching query criteria, strictly bounded to farms owned by the user.
        """
        query = (
            db.query(Expense)
            .join(Farm, Expense.farm_id == Farm.id)
            .options(
                joinedload(Expense.farm),
                joinedload(Expense.field),
                joinedload(Expense.crop),
                joinedload(Expense.payments),
            )
            .filter(Farm.user_id == user_id)
        )

        if farm_id:
            query = query.filter(Expense.farm_id == farm_id)
        if field_id:
            query = query.filter(Expense.field_id == field_id)
        if crop_id:
            query = query.filter(Expense.crop_id == crop_id)
        if category:
            query = query.filter(Expense.category == category.lower().strip())
        if payment_status:
            query = query.filter(Expense.payment_status == payment_status.lower().strip())
        if vendor_name:
            query = query.filter(Expense.vendor_name.ilike(f"%{vendor_name.strip()}%"))
        if start_date:
            query = query.filter(Expense.expense_date >= start_date)
        if end_date:
            query = query.filter(Expense.expense_date <= end_date)
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Expense.title.ilike(search_term),
                    Expense.description.ilike(search_term),
                    Expense.vendor_name.ilike(search_term),
                    Expense.invoice_number.ilike(search_term),
                    Expense.notes.ilike(search_term),
                )
            )

        expenses = query.order_by(desc(Expense.expense_date), desc(Expense.created_at)).all()
        return [cls._to_response_dto(exp) for exp in expenses]

    @classmethod
    def get_expense(cls, db: Session, expense_id: UUID, user_id: UUID) -> ExpenseResponse:
        """Retrieve single expense details with strict ownership verification."""
        expense = (
            db.query(Expense)
            .join(Farm, Expense.farm_id == Farm.id)
            .options(
                joinedload(Expense.farm),
                joinedload(Expense.field),
                joinedload(Expense.crop),
                joinedload(Expense.payments),
            )
            .filter(and_(Expense.id == expense_id, Farm.user_id == user_id))
            .first()
        )
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense record not found or access unauthorized.",
            )
        return cls._to_response_dto(expense)

    @classmethod
    def update_expense(
        cls, db: Session, expense_id: UUID, user_id: UUID, update_in: ExpenseUpdate
    ) -> ExpenseResponse:
        """
        Update an existing expense with consistency checks.
        Ensures amount is never decreased below already disbursed payments.
        """
        expense = (
            db.query(Expense)
            .join(Farm, Expense.farm_id == Farm.id)
            .filter(and_(Expense.id == expense_id, Farm.user_id == user_id))
            .first()
        )
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense record not found or access unauthorized.",
            )

        # Target farm
        target_farm_id = update_in.farm_id if update_in.farm_id is not None else expense.farm_id
        if update_in.farm_id is not None and update_in.farm_id != expense.farm_id:
            cls._validate_farm_ownership(db=db, farm_id=update_in.farm_id, user_id=user_id)
            expense.farm_id = update_in.farm_id

        # Target field
        target_field_id = update_in.field_id if update_in.field_id is not None else expense.field_id
        if target_field_id is not None:
            cls._validate_field_plot(db=db, field_id=target_field_id, farm_id=target_farm_id)
            expense.field_id = target_field_id
        elif update_in.field_id is None and "field_id" in update_in.model_fields_set:
            expense.field_id = None

        # Target crop
        if update_in.crop_id is not None:
            cls._validate_crop_cycle(
                db=db,
                crop_id=update_in.crop_id,
                farm_id=target_farm_id,
                field_id=target_field_id,
            )
            expense.crop_id = update_in.crop_id
        elif update_in.crop_id is None and "crop_id" in update_in.model_fields_set:
            expense.crop_id = None

        # Amount recalculation
        if update_in.amount is not None:
            if update_in.amount < expense.amount_paid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Cannot reduce total expense amount ({update_in.amount} INR) below "
                        f"already recorded disbursements ({expense.amount_paid} INR)."
                    ),
                )
            expense.amount = update_in.amount
            expense.outstanding_balance = expense.amount - expense.amount_paid
            if expense.amount_paid == Decimal("0.00"):
                expense.payment_status = "unpaid"
            elif expense.outstanding_balance == Decimal("0.00"):
                expense.payment_status = "paid"
            else:
                expense.payment_status = "partially_paid"

        if update_in.category is not None:
            expense.category = update_in.category
        if update_in.title is not None:
            expense.title = update_in.title.strip()
        if update_in.description is not None:
            expense.description = update_in.description
        if update_in.expense_date is not None:
            expense.expense_date = update_in.expense_date
        if update_in.payment_method is not None:
            expense.payment_method = update_in.payment_method
        if update_in.vendor_name is not None:
            expense.vendor_name = update_in.vendor_name.strip()
        if update_in.invoice_number is not None:
            expense.invoice_number = update_in.invoice_number.strip()
        if update_in.transaction_reference is not None:
            expense.transaction_reference = update_in.transaction_reference.strip()
        if update_in.notes is not None:
            expense.notes = update_in.notes

        db.commit()
        db.refresh(expense)

        logger.info(f"Updated expense record {expense.id} for user {user_id}")
        return cls._to_response_dto(expense)

    @classmethod
    def delete_expense(
        cls, db: Session, expense_id: UUID, user_id: UUID
    ) -> ExpenseDeleteResponse:
        """
        Safely delete an expense record.
        Rejects deletion if payments have already been disbursed to preserve financial audit trail.
        """
        expense = (
            db.query(Expense)
            .join(Farm, Expense.farm_id == Farm.id)
            .filter(and_(Expense.id == expense_id, Farm.user_id == user_id))
            .first()
        )
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense record not found or access unauthorized.",
            )

        if expense.amount_paid > Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot delete expense with recorded payments ({expense.amount_paid} INR). "
                    "Financial audit records must be preserved."
                ),
            )

        db.delete(expense)
        db.commit()

        logger.info(f"Deleted unpaid expense record {expense_id} for user {user_id}")
        return ExpenseDeleteResponse(
            id=expense_id,
            deleted=True,
            message=f"Expense '{expense.title}' was successfully deleted.",
        )

    @classmethod
    def record_payment(
        cls, db: Session, expense_id: UUID, user_id: UUID, payment_in: ExpensePaymentCreate
    ) -> ExpensePaymentResponse:
        """
        Record an installment or full payment disbursement against an existing expense.
        Transactionally updates amount_paid, outstanding_balance, and payment_status.
        """
        expense = (
            db.query(Expense)
            .join(Farm, Expense.farm_id == Farm.id)
            .filter(and_(Expense.id == expense_id, Farm.user_id == user_id))
            .first()
        )
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense record not found or access unauthorized.",
            )

        if payment_in.amount > expense.outstanding_balance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Payment amount ({payment_in.amount} INR) exceeds outstanding balance "
                    f"({expense.outstanding_balance} INR)."
                ),
            )

        # 1. Create payment entry
        payment = ExpensePayment(
            expense_id=expense.id,
            amount=payment_in.amount,
            payment_date=payment_in.payment_date,
            payment_method=payment_in.payment_method,
            transaction_reference=payment_in.transaction_reference,
            notes=payment_in.notes,
        )
        db.add(payment)

        # 2. Update parent expense financial balances
        expense.amount_paid += payment_in.amount
        expense.outstanding_balance = expense.amount - expense.amount_paid
        expense.payment_method = payment_in.payment_method

        if expense.outstanding_balance == Decimal("0.00"):
            expense.payment_status = "paid"
        else:
            expense.payment_status = "partially_paid"

        db.commit()
        db.refresh(payment)

        logger.info(
            f"Recorded payment of {payment.amount} INR for expense {expense.id} "
            f"(new status='{expense.payment_status}', remaining balance={expense.outstanding_balance})"
        )

        return ExpensePaymentResponse.model_validate(payment)

    @classmethod
    def list_payments(
        cls, db: Session, expense_id: UUID, user_id: UUID
    ) -> List[ExpensePaymentResponse]:
        """List all payment disbursements for a specific expense."""
        expense = (
            db.query(Expense)
            .join(Farm, Expense.farm_id == Farm.id)
            .options(joinedload(Expense.payments))
            .filter(and_(Expense.id == expense_id, Farm.user_id == user_id))
            .first()
        )
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense record not found or access unauthorized.",
            )
        return [ExpensePaymentResponse.model_validate(p) for p in (expense.payments or [])]

    @classmethod
    def get_summary(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        crop_id: Optional[UUID] = None,
        category: Optional[str] = None,
        payment_status: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> ExpenseSummaryResponse:
        """
        Compute authoritative expense summaries, payment statuses, and category distributions.
        Uses exact Python Decimal arithmetic without binary floating-point rounding.
        """
        query = (
            db.query(Expense)
            .join(Farm, Expense.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )

        if farm_id:
            query = query.filter(Expense.farm_id == farm_id)
        if field_id:
            query = query.filter(Expense.field_id == field_id)
        if crop_id:
            query = query.filter(Expense.crop_id == crop_id)
        if category:
            query = query.filter(Expense.category == category.lower().strip())
        if payment_status:
            query = query.filter(Expense.payment_status == payment_status.lower().strip())
        if start_date:
            query = query.filter(Expense.expense_date >= start_date)
        if end_date:
            query = query.filter(Expense.expense_date <= end_date)

        expenses = query.all()

        total_expenses = Decimal("0.00")
        total_paid = Decimal("0.00")
        total_unpaid = Decimal("0.00")
        total_partially_paid = Decimal("0.00")

        paid_count = 0
        unpaid_count = 0
        partially_paid_count = 0

        category_totals: Dict[str, Tuple[Decimal, int]] = {}

        for exp in expenses:
            total_expenses += exp.amount
            total_paid += exp.amount_paid
            total_unpaid += exp.outstanding_balance

            if exp.payment_status == "paid":
                paid_count += 1
            elif exp.payment_status == "partially_paid":
                partially_paid_count += 1
                total_partially_paid += exp.amount
            else:
                unpaid_count += 1

            cat = exp.category
            current_sum, current_cnt = category_totals.get(cat, (Decimal("0.00"), 0))
            category_totals[cat] = (current_sum + exp.amount, current_cnt + 1)

        # Build category breakdown
        breakdown: List[CategoryBreakdownItem] = []
        highest_cat_info: Optional[HighestCategoryInfo] = None
        max_amount = Decimal("0.00")

        for cat, (cat_amount, cat_count) in category_totals.items():
            pct = (
                float(round((cat_amount / total_expenses) * 100, 2))
                if total_expenses > Decimal("0.00")
                else 0.0
            )
            label = EXPENSE_CATEGORY_LABELS.get(cat, cat.title())
            breakdown.append(
                CategoryBreakdownItem(
                    category=cat,
                    category_label=label,
                    total_amount=cat_amount,
                    percentage=pct,
                    count=cat_count,
                )
            )
            if cat_amount > max_amount:
                max_amount = cat_amount
                highest_cat_info = HighestCategoryInfo(
                    category=cat,
                    category_label=label,
                    total_amount=cat_amount,
                )

        # Sort breakdown by descending total amount
        breakdown.sort(key=lambda x: x.total_amount, reverse=True)

        return ExpenseSummaryResponse(
            total_expenses=total_expenses,
            total_paid=total_paid,
            total_unpaid=total_unpaid,
            total_partially_paid=total_partially_paid,
            expense_count=len(expenses),
            paid_count=paid_count,
            unpaid_count=unpaid_count,
            partially_paid_count=partially_paid_count,
            highest_category=highest_cat_info,
            category_breakdown=breakdown,
        )

    @classmethod
    def export_csv(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        crop_id: Optional[UUID] = None,
        category: Optional[str] = None,
        payment_status: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        search: Optional[str] = None,
    ) -> str:
        """Generate CSV export formatted string for filtered expense records."""
        expenses = cls.list_expenses(
            db=db,
            user_id=user_id,
            farm_id=farm_id,
            field_id=field_id,
            crop_id=crop_id,
            category=category,
            payment_status=payment_status,
            start_date=start_date,
            end_date=end_date,
            search=search,
        )

        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow(
            [
                "Expense ID",
                "Date",
                "Title",
                "Category",
                "Farm",
                "Field",
                "Crop",
                "Total Amount (INR)",
                "Amount Paid (INR)",
                "Outstanding Balance (INR)",
                "Payment Status",
                "Payment Method",
                "Vendor",
                "Invoice Number",
                "Transaction Reference",
                "Description",
                "Notes",
                "Created At",
            ]
        )

        for exp in expenses:
            writer.writerow(
                [
                    str(exp.id),
                    exp.expense_date.isoformat(),
                    exp.title,
                    exp.category_label,
                    exp.farm_name or "N/A",
                    exp.field_name or "N/A",
                    exp.crop_name or "N/A",
                    f"{exp.amount:.2f}",
                    f"{exp.amount_paid:.2f}",
                    f"{exp.outstanding_balance:.2f}",
                    exp.payment_status.replace("_", " ").title(),
                    (exp.payment_method or "").replace("_", " ").title(),
                    exp.vendor_name or "",
                    exp.invoice_number or "",
                    exp.transaction_reference or "",
                    exp.description or "",
                    exp.notes or "",
                    exp.created_at.isoformat(),
                ]
            )

        return output.getvalue()
