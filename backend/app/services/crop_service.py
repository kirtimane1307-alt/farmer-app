"""Crop management business logic service."""

import logging
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.farm import Farm
from app.models.field import Field
from app.models.crop import Crop
from app.schemas.crop import CropCreate, CropUpdate, CropResponse, CropDeleteResponse
from app.services.field_service import FieldService

logger = logging.getLogger("farm-management.crop-service")


class CropService:
    """Service implementing CRUD operations, lifecycle state transitions, and user ownership verification for Crops."""

    @staticmethod
    def _to_crop_response(crop: Crop, field_name: str, farm_id: UUID, farm_name: str) -> CropResponse:
        """Helper to construct rich CropResponse including parent field and farm metadata."""
        return CropResponse(
            id=crop.id,
            field_id=crop.field_id,
            field_name=field_name,
            farm_id=farm_id,
            farm_name=farm_name,
            name=crop.name,
            variety=crop.variety,
            season=crop.season,
            sowing_date=crop.sowing_date,
            expected_harvest_date=crop.expected_harvest_date,
            actual_harvest_date=crop.actual_harvest_date,
            status=crop.status,
            planted_area=crop.planted_area,
            planted_area_unit=crop.planted_area_unit,
            seed_quantity=crop.seed_quantity,
            seed_unit=crop.seed_unit,
            notes=crop.notes,
            created_at=crop.created_at,
            updated_at=crop.updated_at,
        )

    @staticmethod
    def list_crops_for_user(
        db: Session,
        user_id: UUID,
        status_filter: Optional[str] = None,
        field_id: Optional[UUID] = None,
        farm_id: Optional[UUID] = None,
        search: Optional[str] = None,
    ) -> List[CropResponse]:
        """
        List all crops owned by the user with optional multi-criteria filtering.
        Ownership is strictly enforced through Farm -> Field -> Crop relationship chain.
        """
        query = (
            db.query(
                Crop,
                Field.name.label("field_name"),
                Farm.id.label("farm_id"),
                Farm.name.label("farm_name"),
            )
            .join(Field, Crop.field_id == Field.id)
            .join(Farm, Field.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )

        if status_filter:
            query = query.filter(Crop.status == status_filter.strip().lower())

        if field_id:
            query = query.filter(Crop.field_id == field_id)

        if farm_id:
            query = query.filter(Farm.id == farm_id)

        if search:
            term = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Crop.name).like(term),
                    func.lower(Crop.variety).like(term),
                    func.lower(Crop.season).like(term),
                    func.lower(Field.name).like(term),
                    func.lower(Farm.name).like(term),
                )
            )

        query = query.order_by(Crop.sowing_date.desc(), Crop.created_at.desc())
        results = query.all()

        return [
            CropService._to_crop_response(crop, f_name, fm_id, fm_name)
            for crop, f_name, fm_id, fm_name in results
        ]

    @staticmethod
    def list_crops_for_field(
        db: Session, field_id: UUID, user_id: UUID
    ) -> List[CropResponse]:
        """
        List all crops recorded under a specific field plot.
        Verifies that the caller owns the parent farm of this field.
        """
        field = FieldService.get_field_by_id(db, field_id, user_id)
        farm_name = field.farm.name if field.farm else "Farm"

        crops = (
            db.query(Crop)
            .filter(Crop.field_id == field_id)
            .order_by(Crop.sowing_date.desc())
            .all()
        )

        return [
            CropService._to_crop_response(c, field.name, field.farm_id, farm_name)
            for c in crops
        ]

    @staticmethod
    def get_crop_by_id(db: Session, crop_id: UUID, user_id: UUID) -> CropResponse:
        """
        Retrieve a single crop by ID.
        Returns HTTP 404 if not found or owned by a different user.
        """
        result = (
            db.query(
                Crop,
                Field.name.label("field_name"),
                Farm.id.label("farm_id"),
                Farm.name.label("farm_name"),
            )
            .join(Field, Crop.field_id == Field.id)
            .join(Farm, Field.farm_id == Farm.id)
            .filter(Crop.id == crop_id, Farm.user_id == user_id)
            .first()
        )

        if not result:
            logger.warning(f"Crop lookup failed or unauthorized for crop_id={crop_id}, user_id={user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crop not found",
            )

        crop, field_name, farm_id, farm_name = result
        return CropService._to_crop_response(crop, field_name, farm_id, farm_name)

    @staticmethod
    def create_crop(
        db: Session,
        crop_in: CropCreate,
        user_id: UUID,
        explicit_field_id: Optional[UUID] = None,
    ) -> CropResponse:
        """
        Create a new crop cycle assigned to an owned field plot.
        Verifies caller ownership through the parent farm.
        """
        target_field_id = explicit_field_id or crop_in.field_id
        if not target_field_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="field_id must be provided to assign this crop to a plot.",
            )

        # Verifies field ownership (raises 404 if unauthorized)
        field = FieldService.get_field_by_id(db, target_field_id, user_id)
        farm_name = field.farm.name if field.farm else "Farm"

        clean_name = crop_in.name.strip()
        clean_variety = crop_in.variety.strip()

        # Prevent duplicate identical sowing on the exact same date & plot
        existing = (
            db.query(Crop)
            .filter(
                Crop.field_id == target_field_id,
                func.lower(Crop.name) == clean_name.lower(),
                func.lower(Crop.variety) == clean_variety.lower(),
                Crop.sowing_date == crop_in.sowing_date,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A crop cycle for '{clean_name}' ({clean_variety}) with sowing date {crop_in.sowing_date} already exists on this plot.",
            )

        new_crop = Crop(
            field_id=target_field_id,
            name=clean_name,
            variety=clean_variety,
            season=crop_in.season.strip() if crop_in.season else None,
            sowing_date=crop_in.sowing_date,
            expected_harvest_date=crop_in.expected_harvest_date,
            actual_harvest_date=crop_in.actual_harvest_date,
            status=crop_in.status,
            planted_area=crop_in.planted_area or field.area,
            planted_area_unit=crop_in.planted_area_unit or field.area_unit,
            seed_quantity=crop_in.seed_quantity,
            seed_unit=crop_in.seed_unit or "kg",
            notes=crop_in.notes.strip() if crop_in.notes else None,
        )

        db.add(new_crop)
        db.commit()
        db.refresh(new_crop)

        logger.info(f"Registered new crop {new_crop.id} ('{clean_name}') on field {target_field_id} for user {user_id}")
        return CropService._to_crop_response(new_crop, field.name, field.farm_id, farm_name)

    @staticmethod
    def update_crop(
        db: Session, crop_id: UUID, crop_update: CropUpdate, user_id: UUID
    ) -> CropResponse:
        """
        Update an existing crop's attributes, stage, or harvest outcomes.
        Verifies caller ownership through Field -> Farm -> User chain.
        """
        # Ensure crop exists and belongs to user
        crop_record = (
            db.query(Crop)
            .join(Field, Crop.field_id == Field.id)
            .join(Farm, Field.farm_id == Farm.id)
            .filter(Crop.id == crop_id, Farm.user_id == user_id)
            .first()
        )
        if not crop_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crop not found",
            )

        update_data = crop_update.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            if value is not None:
                if isinstance(value, str):
                    setattr(crop_record, key, value.strip())
                else:
                    setattr(crop_record, key, value)

        db.commit()
        db.refresh(crop_record)

        # Get parent details for response
        field = crop_record.field
        farm_name = field.farm.name if field and field.farm else "Farm"
        field_name = field.name if field else "Field"
        farm_id = field.farm_id if field else crop_record.field_id

        logger.info(f"Updated crop {crop_id} for user {user_id}")
        return CropService._to_crop_response(crop_record, field_name, farm_id, farm_name)

    @staticmethod
    def delete_crop(db: Session, crop_id: UUID, user_id: UUID) -> CropDeleteResponse:
        """
        Delete a crop cycle record.
        Verifies caller ownership through Field -> Farm -> User chain.
        """
        crop_record = (
            db.query(Crop)
            .join(Field, Crop.field_id == Field.id)
            .join(Farm, Field.farm_id == Farm.id)
            .filter(Crop.id == crop_id, Farm.user_id == user_id)
            .first()
        )
        if not crop_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crop not found",
            )

        crop_name = crop_record.name
        db.delete(crop_record)
        db.commit()

        logger.info(f"Deleted crop {crop_id} ('{crop_name}') for user {user_id}")
        return CropDeleteResponse(
            id=crop_id,
            deleted=True,
            message=f"Crop '{crop_name}' cycle deleted successfully.",
        )
