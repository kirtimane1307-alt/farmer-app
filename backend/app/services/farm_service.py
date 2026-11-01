"""Farm management business logic service."""

import logging
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.farm import Farm
from app.models.field import Field
from app.schemas.farm import FarmCreate, FarmUpdate

logger = logging.getLogger("farm-management.farm-service")


class FarmService:
    """Service implementing CRUD operations and user ownership verification for Farms."""

    @staticmethod
    def list_farms_for_user(db: Session, user_id: UUID) -> List[Farm]:
        """Retrieve all farms belonging exclusively to the authenticated user."""
        farms = (
            db.query(Farm)
            .filter(Farm.user_id == user_id)
            .order_by(Farm.created_at.desc())
            .all()
        )
        # Compute dynamic field_count attribute for each farm
        for farm in farms:
            farm.field_count = len(farm.fields) if farm.fields else 0
        return farms

    @staticmethod
    def get_farm_by_id(db: Session, farm_id: UUID, user_id: UUID) -> Farm:
        """
        Fetch a farm by ID, ensuring strict user ownership.
        Returns HTTP 404 if not found or owned by a different user.
        """
        farm = (
            db.query(Farm)
            .filter(Farm.id == farm_id, Farm.user_id == user_id)
            .first()
        )
        if not farm:
            logger.warning(f"Farm lookup failed or unauthorized for farm_id={farm_id}, user_id={user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farm not found",
            )
        farm.field_count = len(farm.fields) if farm.fields else 0
        return farm

    @staticmethod
    def create_farm(db: Session, farm_in: FarmCreate, user_id: UUID) -> Farm:
        """
        Create a new farm owned by the authenticated user.
        Checks for duplicate farm names within the user's account (case-insensitive).
        """
        clean_name = farm_in.name.strip()
        existing = (
            db.query(Farm)
            .filter(
                Farm.user_id == user_id,
                func.lower(Farm.name) == clean_name.lower(),
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A farm with the name '{clean_name}' already exists in your account.",
            )

        new_farm = Farm(
            user_id=user_id,
            name=clean_name,
            location=farm_in.location.strip(),
            total_area=farm_in.total_area,
            area_unit=farm_in.area_unit.strip().lower() if farm_in.area_unit else "acres",
        )
        db.add(new_farm)
        db.commit()
        db.refresh(new_farm)
        new_farm.field_count = 0
        logger.info(f"Created new farm {new_farm.id} for user {user_id}")
        return new_farm

    @staticmethod
    def update_farm(
        db: Session, farm_id: UUID, farm_update: FarmUpdate, user_id: UUID
    ) -> Farm:
        """
        Update an existing farm's details.
        Ensures user ownership and prevents duplicate farm names.
        """
        farm = FarmService.get_farm_by_id(db, farm_id, user_id)

        update_data = farm_update.model_dump(exclude_unset=True)

        if "name" in update_data and update_data["name"] is not None:
            clean_name = update_data["name"].strip()
            # Check duplicate against other farms owned by user
            existing = (
                db.query(Farm)
                .filter(
                    Farm.user_id == user_id,
                    Farm.id != farm_id,
                    func.lower(Farm.name) == clean_name.lower(),
                )
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"A farm with the name '{clean_name}' already exists in your account.",
                )
            farm.name = clean_name

        if "location" in update_data and update_data["location"] is not None:
            farm.location = update_data["location"].strip()

        if "total_area" in update_data and update_data["total_area"] is not None:
            farm.total_area = update_data["total_area"]

        if "area_unit" in update_data and update_data["area_unit"] is not None:
            farm.area_unit = update_data["area_unit"].strip().lower()

        db.commit()
        db.refresh(farm)
        farm.field_count = len(farm.fields) if farm.fields else 0
        logger.info(f"Updated farm {farm_id} for user {user_id}")
        return farm

    @staticmethod
    def delete_farm(db: Session, farm_id: UUID, user_id: UUID) -> dict:
        """
        Safely delete a farm and all of its associated fields (via database cascade).
        Returns deletion summary.
        """
        farm = FarmService.get_farm_by_id(db, farm_id, user_id)
        field_count = len(farm.fields) if farm.fields else 0
        farm_name = farm.name

        db.delete(farm)
        db.commit()

        logger.info(
            f"Deleted farm {farm_id} ('{farm_name}') and {field_count} cascade fields for user {user_id}"
        )
        return {
            "id": farm_id,
            "deleted": True,
            "fields_removed": field_count,
            "message": f"Farm '{farm_name}' and {field_count} associated field(s) deleted successfully.",
        }
