"""Field management business logic service."""

import logging
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.farm import Farm
from app.models.field import Field
from app.schemas.field import FieldCreate, FieldUpdate
from app.services.farm_service import FarmService

logger = logging.getLogger("farm-management.field-service")


class FieldService:
    """Service implementing CRUD operations and user ownership verification for Fields."""

    @staticmethod
    def list_fields_for_farm(db: Session, farm_id: UUID, user_id: UUID) -> List[Field]:
        """
        List all fields belonging to a specific farm.
        Verifies that the parent farm belongs to the authenticated user.
        """
        # Raises 404 if farm not found or not owned by user
        FarmService.get_farm_by_id(db, farm_id, user_id)

        fields = (
            db.query(Field)
            .filter(Field.farm_id == farm_id)
            .order_by(Field.created_at.asc())
            .all()
        )
        return fields

    @staticmethod
    def list_all_fields_for_user(db: Session, user_id: UUID) -> List[Field]:
        """List all fields across all farms owned by the user."""
        fields = (
            db.query(Field)
            .join(Farm, Field.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
            .order_by(Field.created_at.desc())
            .all()
        )
        return fields

    @staticmethod
    def get_field_by_id(db: Session, field_id: UUID, user_id: UUID) -> Field:
        """
        Retrieve a single field by ID.
        Verifies that the field's parent farm belongs to the authenticated user.
        Returns HTTP 404 if not found or unauthorized.
        """
        field = (
            db.query(Field)
            .join(Farm, Field.farm_id == Farm.id)
            .filter(Field.id == field_id, Farm.user_id == user_id)
            .first()
        )
        if not field:
            logger.warning(f"Field lookup failed or unauthorized for field_id={field_id}, user_id={user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Field not found",
            )
        return field

    @staticmethod
    def create_field(
        db: Session, farm_id: UUID, field_in: FieldCreate, user_id: UUID
    ) -> Field:
        """
        Create a new field plot under a specific farm.
        Verifies farm ownership and prevents duplicate field names on the same farm.
        """
        farm = FarmService.get_farm_by_id(db, farm_id, user_id)

        clean_name = field_in.name.strip()
        existing = (
            db.query(Field)
            .filter(
                Field.farm_id == farm_id,
                func.lower(Field.name) == clean_name.lower(),
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A field with the name '{clean_name}' already exists on this farm.",
            )

        new_field = Field(
            farm_id=farm_id,
            name=clean_name,
            area=field_in.area,
            area_unit=field_in.area_unit.strip().lower() if field_in.area_unit else farm.area_unit,
            soil_type=field_in.soil_type.strip() if field_in.soil_type else None,
            irrigation_type=field_in.irrigation_type.strip() if field_in.irrigation_type else None,
            description=field_in.description.strip() if field_in.description else None,
        )
        db.add(new_field)
        db.commit()
        db.refresh(new_field)

        logger.info(f"Created new field {new_field.id} under farm {farm_id} for user {user_id}")
        return new_field

    @staticmethod
    def update_field(
        db: Session, field_id: UUID, field_update: FieldUpdate, user_id: UUID
    ) -> Field:
        """
        Update an existing field plot.
        Verifies ownership through parent farm and prevents duplicate field names.
        """
        field = FieldService.get_field_by_id(db, field_id, user_id)

        update_data = field_update.model_dump(exclude_unset=True)

        if "name" in update_data and update_data["name"] is not None:
            clean_name = update_data["name"].strip()
            existing = (
                db.query(Field)
                .filter(
                    Field.farm_id == field.farm_id,
                    Field.id != field_id,
                    func.lower(Field.name) == clean_name.lower(),
                )
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"A field with the name '{clean_name}' already exists on this farm.",
                )
            field.name = clean_name

        if "area" in update_data and update_data["area"] is not None:
            field.area = update_data["area"]

        if "area_unit" in update_data and update_data["area_unit"] is not None:
            field.area_unit = update_data["area_unit"].strip().lower()

        if "soil_type" in update_data:
            field.soil_type = update_data["soil_type"].strip() if update_data["soil_type"] else None

        if "irrigation_type" in update_data:
            field.irrigation_type = (
                update_data["irrigation_type"].strip() if update_data["irrigation_type"] else None
            )

        if "description" in update_data:
            field.description = (
                update_data["description"].strip() if update_data["description"] else None
            )

        db.commit()
        db.refresh(field)

        logger.info(f"Updated field {field_id} under farm {field.farm_id} for user {user_id}")
        return field

    @staticmethod
    def delete_field(db: Session, field_id: UUID, user_id: UUID) -> dict:
        """
        Delete a field plot.
        Verifies ownership through parent farm before deletion.
        """
        field = FieldService.get_field_by_id(db, field_id, user_id)
        field_name = field.name

        db.delete(field)
        db.commit()

        logger.info(f"Deleted field {field_id} ('{field_name}') for user {user_id}")
        return {
            "id": field_id,
            "deleted": True,
            "message": f"Field '{field_name}' deleted successfully.",
        }
