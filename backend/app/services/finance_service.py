"""Financial Overview and Profit/Loss service integrating Sales, Other Income, and Phase 12 Expenses."""

import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import Session

from app.models.farm import Farm
from app.models.sale import Sale
from app.models.income import OtherIncome
from app.models.expense import Expense
from app.schemas.finance import FinancialSummaryResponse, MonthlyFinancialRecord

logger = logging.getLogger("farm-management.finance-service")


class FinanceService:
    """Service layer calculating authoritative farm financial telemetry and profit/loss."""

    @staticmethod
    def _validate_farm_ownership(db: Session, farm_id: UUID, user_id: UUID) -> Farm:
        """Verify farm exists and belongs to the authenticated user."""
        farm = (
            db.query(Farm)
            .filter(and_(Farm.id == farm_id, Farm.user_id == user_id))
            .first()
        )
        if not farm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farm not found or you do not have permission to access it.",
            )
        return farm

    @classmethod
    def get_financial_summary(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> FinancialSummaryResponse:
        """
        Aggregate produce sales, non-crop other income, and operational expenses
        to calculate authoritative recorded profit or loss.
        """
        farm_name: Optional[str] = None
        if farm_id:
            farm_obj = cls._validate_farm_ownership(db, farm_id, user_id)
            farm_name = farm_obj.name

        # -------------------------------------------------------------
        # 1. Query Sales Records
        # -------------------------------------------------------------
        sales_query = (
            db.query(Sale)
            .join(Farm, Sale.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )
        if farm_id:
            sales_query = sales_query.filter(Sale.farm_id == farm_id)
        if start_date:
            sales_query = sales_query.filter(Sale.sale_date >= start_date)
        if end_date:
            sales_query = sales_query.filter(Sale.sale_date <= end_date)

        sales = sales_query.all()

        total_sales_revenue = Decimal("0.00")
        total_sales_received = Decimal("0.00")
        outstanding_receivables = Decimal("0.00")
        total_sales_count = len(sales)

        for s in sales:
            total_sales_revenue += s.total_amount
            total_sales_received += s.amount_paid
            outstanding_receivables += s.outstanding_amount

        # -------------------------------------------------------------
        # 2. Query Other Income Records
        # -------------------------------------------------------------
        income_query = (
            db.query(OtherIncome)
            .join(Farm, OtherIncome.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )
        if farm_id:
            income_query = income_query.filter(OtherIncome.farm_id == farm_id)
        if start_date:
            income_query = income_query.filter(OtherIncome.income_date >= start_date)
        if end_date:
            income_query = income_query.filter(OtherIncome.income_date <= end_date)

        incomes = income_query.all()

        total_other_income = Decimal("0.00")
        total_income_count = len(incomes)

        for inc in incomes:
            total_other_income += inc.amount

        # Total revenue is sum of produce sales after discounts + other income
        total_income = (total_sales_revenue + total_other_income).quantize(Decimal("0.01"))

        # -------------------------------------------------------------
        # 3. Query Phase 12 Expenses
        # -------------------------------------------------------------
        expense_query = (
            db.query(Expense)
            .join(Farm, Expense.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )
        if farm_id:
            expense_query = expense_query.filter(Expense.farm_id == farm_id)
        if start_date:
            expense_query = expense_query.filter(Expense.expense_date >= start_date)
        if end_date:
            expense_query = expense_query.filter(Expense.expense_date <= end_date)

        expenses = expense_query.all()

        total_expenses = Decimal("0.00")
        total_expenses_paid = Decimal("0.00")
        outstanding_payables = Decimal("0.00")
        total_expenses_count = len(expenses)

        for exp in expenses:
            total_expenses += exp.amount
            total_expenses_paid += exp.amount_paid
            outstanding_payables += exp.outstanding_balance

        # -------------------------------------------------------------
        # 4. Compute Net Profit / Loss
        # -------------------------------------------------------------
        net_profit_loss = (total_income - total_expenses).quantize(Decimal("0.01"))
        is_profit = net_profit_loss >= Decimal("0.00")

        profit_margin = Decimal("0.00")
        if total_income > Decimal("0.00"):
            profit_margin = ((net_profit_loss / total_income) * Decimal("100.00")).quantize(Decimal("0.01"))

        # -------------------------------------------------------------
        # 5. Build Monthly Financial Timeline
        # -------------------------------------------------------------
        monthly_map: Dict[str, Dict[str, Any]] = {}

        for s in sales:
            m_key = s.sale_date.strftime("%Y-%m")
            if m_key not in monthly_map:
                monthly_map[m_key] = {
                    "month": m_key,
                    "date_obj": s.sale_date,
                    "sales_revenue": Decimal("0.00"),
                    "other_income": Decimal("0.00"),
                    "expenses": Decimal("0.00"),
                }
            monthly_map[m_key]["sales_revenue"] += s.total_amount

        for inc in incomes:
            m_key = inc.income_date.strftime("%Y-%m")
            if m_key not in monthly_map:
                monthly_map[m_key] = {
                    "month": m_key,
                    "date_obj": inc.income_date,
                    "sales_revenue": Decimal("0.00"),
                    "other_income": Decimal("0.00"),
                    "expenses": Decimal("0.00"),
                }
            monthly_map[m_key]["other_income"] += inc.amount

        for exp in expenses:
            m_key = exp.expense_date.strftime("%Y-%m")
            if m_key not in monthly_map:
                monthly_map[m_key] = {
                    "month": m_key,
                    "date_obj": exp.expense_date,
                    "sales_revenue": Decimal("0.00"),
                    "other_income": Decimal("0.00"),
                    "expenses": Decimal("0.00"),
                }
            monthly_map[m_key]["expenses"] += exp.amount

        monthly_breakdown: List[MonthlyFinancialRecord] = []
        for m_key in sorted(monthly_map.keys()):
            data = monthly_map[m_key]
            m_sales = data["sales_revenue"].quantize(Decimal("0.01"))
            m_other = data["other_income"].quantize(Decimal("0.01"))
            m_inc = (m_sales + m_other).quantize(Decimal("0.01"))
            m_exp = data["expenses"].quantize(Decimal("0.01"))
            m_net = (m_inc - m_exp).quantize(Decimal("0.01"))

            # Human friendly label e.g. "Oct 2026"
            label = data["date_obj"].strftime("%b %Y")

            monthly_breakdown.append(
                MonthlyFinancialRecord(
                    month=m_key,
                    month_label=label,
                    sales_revenue=m_sales,
                    other_income=m_other,
                    total_income=m_inc,
                    total_expenses=m_exp,
                    net_profit_loss=m_net,
                    is_profit=m_net >= Decimal("0.00"),
                )
            )

        return FinancialSummaryResponse(
            total_sales_revenue=total_sales_revenue.quantize(Decimal("0.01")),
            total_other_income=total_other_income.quantize(Decimal("0.01")),
            total_income=total_income,
            total_expenses=total_expenses.quantize(Decimal("0.01")),
            net_profit_loss=net_profit_loss,
            is_profit=is_profit,
            profit_margin_percentage=profit_margin,
            total_sales_received=total_sales_received.quantize(Decimal("0.01")),
            outstanding_receivables=outstanding_receivables.quantize(Decimal("0.01")),
            total_expenses_paid=total_expenses_paid.quantize(Decimal("0.01")),
            outstanding_payables=outstanding_payables.quantize(Decimal("0.01")),
            total_sales_count=total_sales_count,
            total_income_count=total_income_count,
            total_expenses_count=total_expenses_count,
            monthly_breakdown=monthly_breakdown,
            farm_id=farm_id,
            farm_name=farm_name,
            start_date=start_date,
            end_date=end_date,
        )
