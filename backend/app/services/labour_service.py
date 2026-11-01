"""Labour/Worker management business logic service."""

import logging
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.farm import Farm
from app.models.labour import Labour
from app.schemas.labour import (
    LabourCreate,
    LabourUpdate,
    LabourResponse,
    LabourDeleteResponse,
    LabourStats,
)

logger = logging.getLogger("farm-management.labour-service")


class LabourService:
    """Service implementing CRUD operations, filtering, and user ownership verification for Labour/Workers."""

    @staticmethod
    def _to_labour_response(labour: Labour, farm_name: Optional[str] = None) -> LabourResponse:
        """Helper to construct rich LabourResponse including farm name metadata."""
        resolved_farm_name = farm_name
        if resolved_farm_name is None and labour.farm:
            resolved_farm_name = labour.farm.name

        return LabourResponse(
            id=labour.id,
            farm_id=labour.farm_id,
            farm_name=resolved_farm_name,
            name=labour.name,
            phone=labour.phone,
            address=labour.address,
            work_type=labour.work_type,
            daily_wage=labour.daily_wage,
            joining_date=labour.joining_date,
            status=labour.status,
            notes=labour.notes,
            created_at=labour.created_at,
            updated_at=labour.updated_at,
        )

    @staticmethod
    def list_labour_for_user(
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        status_filter: Optional[str] = None,
        work_type: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[LabourResponse]:
        """
        List all labour workers belonging to farms owned by the user.
        Ownership is strictly enforced through Farm -> User relationship.
        Supports filtering by farm_id, status ('active', 'inactive'), work_type, and text search.
        """
        query = (
            db.query(
                Labour,
                Farm.name.label("farm_name"),
            )
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )

        if farm_id:
            # Verify the requested farm belongs to the current user
            farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == user_id).first()
            if not farm:
                logger.warning(f"Farm {farm_id} not found or unauthorized for user {user_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Farm not found or access unauthorized",
                )
            query = query.filter(Labour.farm_id == farm_id)

        if status_filter:
            clean_status = status_filter.strip().lower()
            query = query.filter(Labour.status == clean_status)

        if work_type:
            clean_work_type = work_type.strip()
            query = query.filter(func.lower(Labour.work_type) == clean_work_type.lower())

        if search:
            term = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Labour.name).like(term),
                    func.lower(Labour.phone).like(term),
                    func.lower(Labour.work_type).like(term),
                    func.lower(Farm.name).like(term),
                )
            )

        # Active workers first, then descending by creation date
        query = query.order_by(
            Labour.status.asc(),  # 'active' precedes 'inactive' alphabetically
            Labour.created_at.desc(),
        )

        results = query.all()
        return [
            LabourService._to_labour_response(labour, farm_name)
            for labour, farm_name in results
        ]

    @staticmethod
    def get_labour_by_id(db: Session, labour_id: UUID, user_id: UUID) -> LabourResponse:
        """
        Fetch worker details by ID, verifying user ownership via parent Farm.
        """
        result = (
            db.query(Labour, Farm.name.label("farm_name"))
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(Labour.id == labour_id, Farm.user_id == user_id)
            .first()
        )

        if not result:
            logger.warning(f"Labour lookup failed or unauthorized: labour_id={labour_id}, user_id={user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Worker record not found",
            )

        labour, farm_name = result
        return LabourService._to_labour_response(labour, farm_name)

    @staticmethod
    def create_labour(
        db: Session,
        farm_id: UUID,
        labour_in: LabourCreate,
        user_id: UUID,
    ) -> LabourResponse:
        """
        Register a new worker under a specific farm owned by the authenticated user.
        Strictly verifies that the target farm belongs to user_id.
        """
        farm = (
            db.query(Farm)
            .filter(Farm.id == farm_id, Farm.user_id == user_id)
            .first()
        )
        if not farm:
            logger.warning(f"Unauthorized or nonexistent farm assignment: farm_id={farm_id}, user_id={user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target farm not found or access unauthorized",
            )

        clean_name = labour_in.name.strip()
        new_labour = Labour(
            farm_id=farm.id,
            name=clean_name,
            phone=labour_in.phone.strip() if labour_in.phone else None,
            address=labour_in.address.strip() if labour_in.address else None,
            work_type=labour_in.work_type.strip() if labour_in.work_type else "General Labour",
            daily_wage=labour_in.daily_wage,
            joining_date=labour_in.joining_date,
            status=labour_in.status,
            notes=labour_in.notes.strip() if labour_in.notes else None,
        )

        db.add(new_labour)
        db.commit()
        db.refresh(new_labour)

        logger.info(f"Registered new worker {new_labour.id} ('{clean_name}') on farm {farm.id} for user {user_id}")
        return LabourService._to_labour_response(new_labour, farm.name)

    @staticmethod
    def update_labour(
        db: Session,
        labour_id: UUID,
        labour_update: LabourUpdate,
        user_id: UUID,
    ) -> LabourResponse:
        """
        Update an existing worker record, strictly verifying user ownership.
        """
        result = (
            db.query(Labour, Farm.name.label("farm_name"))
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(Labour.id == labour_id, Farm.user_id == user_id)
            .first()
        )

        if not result:
            logger.warning(f"Labour update unauthorized or nonexistent: labour_id={labour_id}, user_id={user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Worker record not found",
            )

        labour, farm_name = result
        update_data = labour_update.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if value is not None and isinstance(value, str):
                setattr(labour, field, value.strip())
            else:
                setattr(labour, field, value)

        db.commit()
        db.refresh(labour)

        logger.info(f"Updated worker {labour.id} for user {user_id}")
        return LabourService._to_labour_response(labour, farm_name)

    @staticmethod
    def deactivate_or_delete_labour(
        db: Session,
        labour_id: UUID,
        user_id: UUID,
        permanent: bool = False,
    ) -> LabourDeleteResponse:
        """
        Deactivate worker (Active -> Inactive) or permanently delete record.
        Defaults to safe deactivation to safeguard future attendance and payroll history.
        """
        labour = (
            db.query(Labour)
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(Labour.id == labour_id, Farm.user_id == user_id)
            .first()
        )

        if not labour:
            logger.warning(f"Labour deactivation/deletion unauthorized or nonexistent: labour_id={labour_id}, user_id={user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Worker record not found",
            )

        worker_name = labour.name

        if permanent:
            db.delete(labour)
            db.commit()
            logger.info(f"Permanently deleted worker {labour_id} ('{worker_name}') for user {user_id}")
            return LabourDeleteResponse(
                id=labour_id,
                name=worker_name,
                deactivated=False,
                status="deleted",
                message=f"Worker '{worker_name}' was permanently deleted.",
            )
        else:
            labour.status = "inactive"
            db.commit()
            logger.info(f"Deactivated worker {labour_id} ('{worker_name}') for user {user_id}")
            return LabourDeleteResponse(
                id=labour_id,
                name=worker_name,
                deactivated=True,
                status="inactive",
                message=f"Worker '{worker_name}' was deactivated. The profile is preserved for historical attendance records.",
            )

    @staticmethod
    def get_labour_stats_for_user(db: Session, user_id: UUID) -> LabourStats:
        """
        Compute high-level workforce statistics for the authenticated user.
        """
        base_query = (
            db.query(Labour)
            .join(Farm, Labour.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
        )

        total_workers = base_query.count()
        active_workers = base_query.filter(Labour.status == "active").count()
        inactive_workers = base_query.filter(Labour.status == "inactive").count()

        return LabourStats(
            total_workers=total_workers,
            active_workers=active_workers,
            inactive_workers=inactive_workers,
        )
