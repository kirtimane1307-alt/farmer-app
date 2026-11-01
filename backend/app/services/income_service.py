"""Other Farm Income service managing multi-tenant non-crop farm income ledgers."""

import logging
from datetime import date
from decimal import Decimal
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import Session, joinedload

from app.models.farm import Farm
from app.models.income import OtherIncome, INCOME_CATEGORIES, INCOME_CATEGORY_LABELS
from app.schemas.income import (
    IncomeCreate,
    IncomeUpdate,
    IncomeResponse,
    IncomeSummaryResponse,
    CategoryIncomeBreakdown,
    IncomeDeleteResponse,
)

logger = logging.getLogger("farm-management.income-service")


class IncomeService:
    """Service layer managing other farm income transactions (subsidies, rentals, etc.)."""

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

    @classmethod
    def _populate_income_response(cls, income: OtherIncome) -> IncomeResponse:
        """Construct response model with human-readable category labels and farm name."""
        category_label = INCOME_CATEGORY_LABELS.get(
            income.category, income.category.replace("_", " ").title()
        )
        return IncomeResponse(
            id=income.id,
            farm_id=income.farm_id,
            farm_name=income.farm.name if income.farm else None,
            category=income.category,
            category_label=category_label,
            description=income.description,
            amount=income.amount,
            income_date=income.income_date,
            source=income.source,
            payment_method=income.payment_method,
            reference_number=income.reference_number,
            notes=income.notes,
            created_at=income.created_at,
            updated_at=income.updated_at,
        )

    @classmethod
    def create_income(
        cls, db: Session, user_id: UUID, payload: IncomeCreate
    ) -> IncomeResponse:
        """Record new other farm income."""
        farm = cls._validate_farm_ownership(db, payload.farm_id, user_id)

        clean_category = payload.category.strip().lower()
        amount = payload.amount.quantize(Decimal("0.01"))
        if amount <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Income amount must be strictly greater than zero.",
            )

        income = OtherIncome(
            farm_id=payload.farm_id,
            created_by_id=user_id,
            income_date=payload.income_date,
            category=clean_category,
            description=payload.description.strip(),
            amount=amount,
            source=payload.source.strip() if payload.source else None,
            payment_method=payload.payment_method or "cash",
            reference_number=payload.reference_number.strip() if payload.reference_number else None,
            notes=payload.notes.strip() if payload.notes else None,
        )
        db.add(income)
        db.commit()
        db.refresh(income)
        logger.info(
            f"Created other income {income.id} ({income.amount} INR) for farm '{farm.name}' by user {user_id}"
        )
        return cls._populate_income_response(income)

    @classmethod
    def list_incomes(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        category: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[IncomeResponse]:
        """Query other income records belonging to authenticated user with multi-criteria filters."""
        query = (
            db.query(OtherIncome)
            .join(Farm, OtherIncome.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
            .options(joinedload(OtherIncome.farm))
        )

        if farm_id:
            query = query.filter(OtherIncome.farm_id == farm_id)
        if category:
            query = query.filter(OtherIncome.category == category.strip().lower())
        if start_date:
            query = query.filter(OtherIncome.income_date >= start_date)
        if end_date:
            query = query.filter(OtherIncome.income_date <= end_date)
        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    OtherIncome.description.ilike(term),
                    OtherIncome.source.ilike(term),
                    OtherIncome.reference_number.ilike(term),
                    OtherIncome.notes.ilike(term),
                )
            )

        incomes = (
            query.order_by(desc(OtherIncome.income_date), desc(OtherIncome.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [cls._populate_income_response(inc) for inc in incomes]

    @classmethod
    def get_income_by_id(
        cls, db: Session, income_id: UUID, user_id: UUID
    ) -> IncomeResponse:
        """Fetch single other income entry."""
        income = (
            db.query(OtherIncome)
            .join(Farm, OtherIncome.farm_id == Farm.id)
            .filter(and_(OtherIncome.id == income_id, Farm.user_id == user_id))
            .options(joinedload(OtherIncome.farm))
            .first()
        )
        if not income:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Income record not found or access unauthorized.",
            )
        return cls._populate_income_response(income)

    @classmethod
    def update_income(
        cls, db: Session, income_id: UUID, user_id: UUID, payload: IncomeUpdate
    ) -> IncomeResponse:
        """Update existing other income record."""
        income = (
            db.query(OtherIncome)
            .join(Farm, OtherIncome.farm_id == Farm.id)
            .filter(and_(OtherIncome.id == income_id, Farm.user_id == user_id))
            .options(joinedload(OtherIncome.farm))
            .first()
        )
        if not income:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Income record not found or access unauthorized.",
            )

        if payload.farm_id is not None and payload.farm_id != income.farm_id:
            cls._validate_farm_ownership(db, payload.farm_id, user_id)
            income.farm_id = payload.farm_id

        if payload.income_date is not None:
            income.income_date = payload.income_date
        if payload.category is not None:
            income.category = payload.category.strip().lower()
        if payload.description is not None:
            income.description = payload.description.strip()
        if payload.amount is not None:
            amt = payload.amount.quantize(Decimal("0.01"))
            if amt <= Decimal("0.00"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Income amount must be strictly greater than zero.",
                )
            income.amount = amt
        if payload.source is not None:
            income.source = payload.source.strip() or None
        if payload.payment_method is not None:
            income.payment_method = payload.payment_method
        if payload.reference_number is not None:
            income.reference_number = payload.reference_number.strip() or None
        if payload.notes is not None:
            income.notes = payload.notes.strip() or None

        db.commit()
        db.refresh(income)
        logger.info(f"Updated income record {income.id} by user {user_id}")
        return cls._populate_income_response(income)

    @classmethod
    def delete_income(
        cls, db: Session, income_id: UUID, user_id: UUID
    ) -> IncomeDeleteResponse:
        """Delete an other income record."""
        income = (
            db.query(OtherIncome)
            .join(Farm, OtherIncome.farm_id == Farm.id)
            .filter(and_(OtherIncome.id == income_id, Farm.user_id == user_id))
            .first()
        )
        if not income:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Income record not found or access unauthorized.",
            )

        desc_text = income.description
        db.delete(income)
        db.commit()
        logger.info(f"Deleted other income {income_id} by user {user_id}")
        return IncomeDeleteResponse(
            id=income_id,
            deleted=True,
            message=f"Income record '{desc_text}' successfully deleted.",
        )

    @classmethod
    def get_income_summary(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> IncomeSummaryResponse:
        """Compute aggregate totals and category breakdown for other farm income."""
        query = (
            db.query(OtherIncome)
            .join(Farm, OtherIncome.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )

        if farm_id:
            query = query.filter(OtherIncome.farm_id == farm_id)
        if start_date:
            query = query.filter(OtherIncome.income_date >= start_date)
        if end_date:
            query = query.filter(OtherIncome.income_date <= end_date)

        incomes = query.all()
        total_income = Decimal("0.00")
        category_map: Dict[str, Dict[str, Any]] = {}

        for inc in incomes:
            total_income += inc.amount
            cat = inc.category
            if cat not in category_map:
                category_map[cat] = {
                    "category": cat,
                    "category_label": INCOME_CATEGORY_LABELS.get(
                        cat, cat.replace("_", " ").title()
                    ),
                    "total_amount": Decimal("0.00"),
                    "count": 0,
                }
            category_map[cat]["total_amount"] += inc.amount
            category_map[cat]["count"] += 1

        top_category = None
        if category_map:
            top_category = max(category_map.values(), key=lambda x: x["total_amount"])["category_label"]

        breakdown = []
        for cat_data in sorted(category_map.values(), key=lambda x: x["total_amount"], reverse=True):
            pct = Decimal("0.00")
            if total_income > Decimal("0.00"):
                pct = ((cat_data["total_amount"] / total_income) * Decimal("100.00")).quantize(Decimal("0.01"))
            breakdown.append(
                CategoryIncomeBreakdown(
                    category=cat_data["category"],
                    category_label=cat_data["category_label"],
                    total_amount=cat_data["total_amount"].quantize(Decimal("0.01")),
                    percentage=pct,
                    count=cat_data["count"],
                )
            )

        return IncomeSummaryResponse(
            total_income=total_income.quantize(Decimal("0.01")),
            total_count=len(incomes),
            top_category=top_category,
            category_breakdown=breakdown,
        )
