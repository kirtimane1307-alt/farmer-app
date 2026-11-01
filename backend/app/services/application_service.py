"""Agricultural Application business logic service for fertilizer and pesticide management."""

import logging
from datetime import date
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc

from app.models.farm import Farm
from app.models.field import Field
from app.models.crop import Crop
from app.models.application import AgriculturalApplication
from app.schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    ApplicationSummaryResponse,
    ApplicationDeleteResponse,
)

logger = logging.getLogger("farm-management.application-service")


class ApplicationService:
    """Service implementing CRUD operations, decimal cost calculations, and tenant validation."""

    @staticmethod
    def _validate_hierarchy_and_ownership(
        db: Session,
        user_id: UUID,
        farm_id: UUID,
        field_id: UUID,
        crop_id: Optional[UUID] = None,
    ) -> Tuple[Farm, Field, Optional[Crop]]:
        """
        Validates the strict ownership and relational hierarchy:
        1. Farm belongs to the authenticated user.
        2. Field belongs to the specified farm.
        3. If provided, Crop belongs to the specified field.
        """
        farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == user_id).first()
        if not farm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farm not found or access unauthorized",
            )

        field = db.query(Field).filter(Field.id == field_id, Field.farm_id == farm_id).first()
        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Field plot not found on the specified farm or access unauthorized",
            )

        crop = None
        if crop_id:
            crop = db.query(Crop).filter(Crop.id == crop_id, Crop.field_id == field_id).first()
            if not crop:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Crop cycle not found on the specified field or access unauthorized",
                )

        return farm, field, crop

    @staticmethod
    def _compute_costs(
        quantity: Decimal,
        unit_cost: Optional[Decimal],
        total_cost: Optional[Decimal],
    ) -> Tuple[Optional[Decimal], Optional[Decimal]]:
        """
        Computes unit and total costs accurately using Decimals:
        - If unit_cost is provided and total_cost is omitted: total_cost = quantity * unit_cost.
        - If total_cost is explicitly provided: preserves provided total_cost.
        - Returns (unit_cost, total_cost).
        """
        computed_unit_cost = unit_cost.quantize(Decimal("0.01")) if unit_cost is not None else None
        computed_total_cost = None

        if total_cost is not None:
            computed_total_cost = total_cost.quantize(Decimal("0.01"))
        elif computed_unit_cost is not None:
            computed_total_cost = (quantity * computed_unit_cost).quantize(Decimal("0.01"))

        return computed_unit_cost, computed_total_cost

    @staticmethod
    def _to_response(
        app: AgriculturalApplication,
        farm: Optional[Farm] = None,
        field: Optional[Field] = None,
        crop: Optional[Crop] = None,
    ) -> ApplicationResponse:
        """Serializes ORM model to Pydantic response with joined entity names."""
        farm_obj = farm or getattr(app, "farm", None)
        field_obj = field or getattr(app, "field", None)
        crop_obj = crop or getattr(app, "crop", None)

        return ApplicationResponse(
            id=app.id,
            farm_id=app.farm_id,
            farm_name=farm_obj.name if farm_obj else None,
            field_id=app.field_id,
            field_name=field_obj.name if field_obj else None,
            crop_id=app.crop_id,
            crop_name=crop_obj.name if crop_obj else None,
            crop_variety=crop_obj.variety if crop_obj else None,
            application_category=app.application_category,  # type: ignore
            product_name=app.product_name,
            product_type=app.product_type,
            quantity=app.quantity,
            unit=app.unit,
            unit_cost=app.unit_cost,
            total_cost=app.total_cost,
            application_date=app.application_date,
            application_method=app.application_method,
            purpose=app.purpose,
            notes=app.notes,
            created_at=app.created_at,
            updated_at=app.updated_at,
        )

    @staticmethod
    def create_application(
        db: Session,
        user_id: UUID,
        app_in: ApplicationCreate,
    ) -> ApplicationResponse:
        """Create and store a new fertilizer or pesticide application record."""
        farm, field, crop = ApplicationService._validate_hierarchy_and_ownership(
            db, user_id, app_in.farm_id, app_in.field_id, app_in.crop_id
        )

        unit_cost, total_cost = ApplicationService._compute_costs(
            app_in.quantity, app_in.unit_cost, app_in.total_cost
        )

        new_app = AgriculturalApplication(
            farm_id=app_in.farm_id,
            field_id=app_in.field_id,
            crop_id=app_in.crop_id,
            application_category=app_in.application_category,
            product_name=app_in.product_name,
            product_type=app_in.product_type,
            quantity=app_in.quantity.quantize(Decimal("0.01")),
            unit=app_in.unit,
            unit_cost=unit_cost,
            total_cost=total_cost,
            application_date=app_in.application_date,
            application_method=app_in.application_method,
            purpose=app_in.purpose,
            notes=app_in.notes,
        )

        db.add(new_app)
        db.commit()
        db.refresh(new_app)

        logger.info(
            f"Logged {new_app.application_category} application {new_app.id} "
            f"('{new_app.product_name}') on field '{field.name}' for user {user_id}"
        )

        return ApplicationService._to_response(new_app, farm, field, crop)

    @staticmethod
    def get_application_by_id(
        db: Session,
        user_id: UUID,
        app_id: UUID,
    ) -> ApplicationResponse:
        """Fetch an application record by ID with verified tenant ownership."""
        result = (
            db.query(AgriculturalApplication, Farm, Field, Crop)
            .join(Farm, AgriculturalApplication.farm_id == Farm.id)
            .join(Field, AgriculturalApplication.field_id == Field.id)
            .outerjoin(Crop, AgriculturalApplication.crop_id == Crop.id)
            .filter(AgriculturalApplication.id == app_id, Farm.user_id == user_id)
            .first()
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application record not found or access unauthorized",
            )
        app, farm, field, crop = result
        return ApplicationService._to_response(app, farm, field, crop)

    @staticmethod
    def update_application(
        db: Session,
        user_id: UUID,
        app_id: UUID,
        app_in: ApplicationUpdate,
    ) -> ApplicationResponse:
        """Update an existing agricultural application record."""
        result = (
            db.query(AgriculturalApplication, Farm, Field, Crop)
            .join(Farm, AgriculturalApplication.farm_id == Farm.id)
            .join(Field, AgriculturalApplication.field_id == Field.id)
            .outerjoin(Crop, AgriculturalApplication.crop_id == Crop.id)
            .filter(AgriculturalApplication.id == app_id, Farm.user_id == user_id)
            .first()
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application record not found or access unauthorized",
            )
        app, farm, field, crop = result

        # Check hierarchy updates
        target_farm_id = app_in.farm_id or app.farm_id
        target_field_id = app_in.field_id or app.field_id
        target_crop_id = app_in.crop_id if app_in.crop_id is not None else app.crop_id

        if (
            target_farm_id != app.farm_id
            or target_field_id != app.field_id
            or target_crop_id != app.crop_id
        ):
            farm, field, crop = ApplicationService._validate_hierarchy_and_ownership(
                db, user_id, target_farm_id, target_field_id, target_crop_id
            )
            app.farm_id = target_farm_id
            app.field_id = target_field_id
            app.crop_id = target_crop_id

        if app_in.application_category is not None:
            app.application_category = app_in.application_category
        if app_in.product_name is not None:
            app.product_name = app_in.product_name.strip()
        if app_in.product_type is not None:
            app.product_type = app_in.product_type.strip()
        if app_in.unit is not None:
            app.unit = app_in.unit.strip()
        if app_in.application_date is not None:
            app.application_date = app_in.application_date
        if app_in.application_method is not None:
            app.application_method = app_in.application_method
        if app_in.purpose is not None:
            app.purpose = app_in.purpose
        if app_in.notes is not None:
            app.notes = app_in.notes

        # Recalculate quantity & costs
        new_quantity = app_in.quantity if app_in.quantity is not None else app.quantity
        new_unit_cost = app_in.unit_cost if app_in.unit_cost is not None else app.unit_cost
        new_total_cost = app_in.total_cost if app_in.total_cost is not None else None

        unit_cost, total_cost = ApplicationService._compute_costs(
            new_quantity, new_unit_cost, new_total_cost
        )

        app.quantity = new_quantity.quantize(Decimal("0.01"))
        app.unit_cost = unit_cost
        app.total_cost = total_cost

        db.commit()
        db.refresh(app)

        logger.info(f"Updated application record {app.id} for user {user_id}")
        return ApplicationService._to_response(app, farm, field, crop)

    @staticmethod
    def delete_application(
        db: Session,
        user_id: UUID,
        app_id: UUID,
    ) -> ApplicationDeleteResponse:
        """Safely delete an agricultural application record."""
        app = (
            db.query(AgriculturalApplication)
            .join(Farm, AgriculturalApplication.farm_id == Farm.id)
            .filter(AgriculturalApplication.id == app_id, Farm.user_id == user_id)
            .first()
        )
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application record not found or access unauthorized",
            )

        db.delete(app)
        db.commit()
        logger.info(f"Deleted application record {app_id} for user {user_id}")
        return ApplicationDeleteResponse(
            id=app_id,
            deleted=True,
            message="Agricultural application record deleted successfully",
        )

    @staticmethod
    def list_applications(
        db: Session,
        user_id: UUID,
        category: Optional[str] = None,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        crop_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        product_type: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[ApplicationResponse]:
        """List agricultural applications matching multi-criteria filters with tenant verification."""
        query = (
            db.query(AgriculturalApplication, Farm, Field, Crop)
            .join(Farm, AgriculturalApplication.farm_id == Farm.id)
            .join(Field, AgriculturalApplication.field_id == Field.id)
            .outerjoin(Crop, AgriculturalApplication.crop_id == Crop.id)
            .filter(Farm.user_id == user_id)
        )

        if category:
            clean_cat = category.strip().lower()
            query = query.filter(AgriculturalApplication.application_category == clean_cat)

        if farm_id:
            query = query.filter(AgriculturalApplication.farm_id == farm_id)

        if field_id:
            query = query.filter(AgriculturalApplication.field_id == field_id)

        if crop_id:
            query = query.filter(AgriculturalApplication.crop_id == crop_id)

        if start_date:
            query = query.filter(AgriculturalApplication.application_date >= start_date)

        if end_date:
            query = query.filter(AgriculturalApplication.application_date <= end_date)

        if product_type:
            clean_pt = product_type.strip().lower()
            query = query.filter(func.lower(AgriculturalApplication.product_type) == clean_pt)

        if search:
            term = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(AgriculturalApplication.product_name).like(term),
                    func.lower(AgriculturalApplication.product_type).like(term),
                    func.lower(AgriculturalApplication.purpose).like(term),
                    func.lower(Farm.name).like(term),
                    func.lower(Field.name).like(term),
                    func.lower(Crop.name).like(term),
                )
            )

        query = query.order_by(
            desc(AgriculturalApplication.application_date),
            desc(AgriculturalApplication.created_at),
        )

        results = query.all()
        return [ApplicationService._to_response(a, fa, fi, cr) for a, fa, fi, cr in results]

    @staticmethod
    def get_applications_summary(
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> ApplicationSummaryResponse:
        """Calculate aggregate application counts and total expenditures by category."""
        query = (
            db.query(AgriculturalApplication)
            .join(Farm, AgriculturalApplication.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )

        if farm_id:
            query = query.filter(AgriculturalApplication.farm_id == farm_id)
        if start_date:
            query = query.filter(AgriculturalApplication.application_date >= start_date)
        if end_date:
            query = query.filter(AgriculturalApplication.application_date <= end_date)

        records: List[AgriculturalApplication] = query.all()

        fert_records = [r for r in records if r.application_category == "fertilizer"]
        pest_records = [r for r in records if r.application_category == "pesticide"]

        fert_cost = sum((r.total_cost for r in fert_records if r.total_cost is not None), Decimal("0.00"))
        pest_cost = sum((r.total_cost for r in pest_records if r.total_cost is not None), Decimal("0.00"))
        total_cost = fert_cost + pest_cost

        return ApplicationSummaryResponse(
            total_applications_count=len(records),
            fertilizer_applications_count=len(fert_records),
            pesticide_applications_count=len(pest_records),
            total_fertilizer_cost=fert_cost.quantize(Decimal("0.01")),
            total_pesticide_cost=pest_cost.quantize(Decimal("0.01")),
            total_combined_cost=total_cost.quantize(Decimal("0.01")),
        )
