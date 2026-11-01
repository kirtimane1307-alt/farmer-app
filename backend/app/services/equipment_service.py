"""Equipment and Machinery service implementing business rules, multi-tenant isolation, and maintenance tracking."""

import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.farm import Farm
from app.models.field import Field
from app.models.equipment import (
    Equipment,
    EquipmentMaintenance,
    MAINTENANCE_TYPE_LABELS,
)
from app.schemas.equipment import (
    EquipmentCreate,
    EquipmentUpdate,
    EquipmentStatusUpdate,
    EquipmentResponse,
    EquipmentMaintenanceCreate,
    EquipmentMaintenanceUpdate,
    EquipmentMaintenanceResponse,
    EquipmentSummaryResponse,
    EquipmentDeleteResponse,
)

logger = logging.getLogger("farm-management.equipment-service")


class EquipmentService:
    """Service layer managing farm equipment and maintenance records."""

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
        """Verify that the field plot exists and belongs to the specified farm."""
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

    @classmethod
    def _get_equipment_for_user(
        cls, db: Session, equipment_id: UUID, user_id: UUID
    ) -> Equipment:
        """Fetch equipment verifying ownership through the parent farm."""
        equipment = (
            db.query(Equipment)
            .join(Farm, Equipment.farm_id == Farm.id)
            .filter(and_(Equipment.id == equipment_id, Farm.user_id == user_id))
            .options(
                joinedload(Equipment.farm),
                joinedload(Equipment.field),
                selectinload(Equipment.maintenance_records),
            )
            .first()
        )
        if not equipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Equipment not found or you do not have permission to access it.",
            )
        return equipment

    @classmethod
    def _get_maintenance_for_user(
        cls, db: Session, maintenance_id: UUID, user_id: UUID
    ) -> EquipmentMaintenance:
        """Fetch maintenance record verifying ownership through equipment -> farm."""
        record = (
            db.query(EquipmentMaintenance)
            .join(Equipment, EquipmentMaintenance.equipment_id == Equipment.id)
            .join(Farm, Equipment.farm_id == Farm.id)
            .filter(and_(EquipmentMaintenance.id == maintenance_id, Farm.user_id == user_id))
            .options(
                joinedload(EquipmentMaintenance.equipment).joinedload(Equipment.farm),
            )
            .first()
        )
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Maintenance record not found or you do not have permission to access it.",
            )
        return record

    @staticmethod
    def _compute_service_status(equipment: Equipment, today: Optional[date] = None) -> str:
        """Compute the operational service alert status."""
        if equipment.operational_status == "retired":
            return "retired"
        if not equipment.next_service_date:
            return "not_scheduled"

        current_date = today or date.today()
        if equipment.next_service_date < current_date:
            return "overdue"
        elif equipment.next_service_date <= current_date + timedelta(days=7):
            return "due_soon"
        elif equipment.next_service_date <= current_date + timedelta(days=30):
            return "upcoming"
        return "ok"

    @classmethod
    def _to_maintenance_dto(
        cls, record: EquipmentMaintenance
    ) -> EquipmentMaintenanceResponse:
        """Convert EquipmentMaintenance ORM model to response DTO."""
        label = MAINTENANCE_TYPE_LABELS.get(record.maintenance_type, record.maintenance_type.title())
        equipment_name = record.equipment.equipment_name if record.equipment else None
        equipment_type = record.equipment.equipment_type if record.equipment else None
        farm_id = record.equipment.farm_id if record.equipment else None
        farm_name = record.equipment.farm.name if record.equipment and record.equipment.farm else None

        return EquipmentMaintenanceResponse(
            id=record.id,
            equipment_id=record.equipment_id,
            equipment_name=equipment_name,
            equipment_type=equipment_type,
            farm_id=farm_id,
            farm_name=farm_name,
            maintenance_type=record.maintenance_type,
            maintenance_type_label=label,
            service_date=record.service_date,
            description=record.description,
            service_provider=record.service_provider,
            parts_replaced=record.parts_replaced,
            cost=Decimal(str(record.cost)) if record.cost is not None else None,
            downtime_minutes=record.downtime_minutes,
            next_service_date=record.next_service_date,
            notes=record.notes,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    @classmethod
    def _to_equipment_dto(
        cls, equipment: Equipment, include_maintenance: bool = True
    ) -> EquipmentResponse:
        """Convert Equipment ORM model to response DTO with calculated totals."""
        records = equipment.maintenance_records or []
        maint_count = len(records)
        total_maint_cost = sum(
            (Decimal(str(r.cost)) for r in records if r.cost is not None),
            Decimal("0.00"),
        )
        service_stat = cls._compute_service_status(equipment)

        maintenance_dtos = (
            [cls._to_maintenance_dto(r) for r in records] if include_maintenance else None
        )

        return EquipmentResponse(
            id=equipment.id,
            farm_id=equipment.farm_id,
            farm_name=equipment.farm.name if equipment.farm else None,
            field_id=equipment.field_id,
            field_name=equipment.field.name if equipment.field else None,
            equipment_name=equipment.equipment_name,
            equipment_type=equipment.equipment_type,
            brand=equipment.brand,
            model_number=equipment.model_number,
            serial_number=equipment.serial_number,
            purchase_date=equipment.purchase_date,
            purchase_price=Decimal(str(equipment.purchase_price))
            if equipment.purchase_price is not None
            else None,
            supplier_name=equipment.supplier_name,
            quantity=equipment.quantity,
            condition=equipment.condition,
            operational_status=equipment.operational_status,
            fuel_type=equipment.fuel_type,
            identification_number=equipment.identification_number,
            warranty_expiry_date=equipment.warranty_expiry_date,
            last_service_date=equipment.last_service_date,
            next_service_date=equipment.next_service_date,
            service_status=service_stat,
            notes=equipment.notes,
            created_at=equipment.created_at,
            updated_at=equipment.updated_at,
            maintenance_count=maint_count,
            total_maintenance_cost=total_maint_cost,
            maintenance_records=maintenance_dtos,
        )

    # =========================================================================
    # Equipment CRUD
    # =========================================================================

    @classmethod
    def create_equipment(
        cls, db: Session, payload: EquipmentCreate, user_id: UUID
    ) -> EquipmentResponse:
        """Register a new piece of equipment or machinery."""
        # 1. Validate Farm Ownership
        farm = cls._validate_farm_ownership(db=db, farm_id=payload.farm_id, user_id=user_id)

        # 2. Validate Field Plot if supplied
        if payload.field_id:
            cls._validate_field_plot(db=db, field_id=payload.field_id, farm_id=payload.farm_id)

        # 3. Create Record
        equipment = Equipment(
            farm_id=payload.farm_id,
            field_id=payload.field_id,
            equipment_name=payload.equipment_name,
            equipment_type=payload.equipment_type,
            brand=payload.brand,
            model_number=payload.model_number,
            serial_number=payload.serial_number,
            purchase_date=payload.purchase_date,
            purchase_price=payload.purchase_price,
            supplier_name=payload.supplier_name,
            quantity=payload.quantity,
            condition=payload.condition,
            operational_status=payload.operational_status,
            fuel_type=payload.fuel_type,
            identification_number=payload.identification_number,
            warranty_expiry_date=payload.warranty_expiry_date,
            last_service_date=payload.last_service_date,
            next_service_date=payload.next_service_date,
            notes=payload.notes,
        )
        db.add(equipment)
        db.commit()
        db.refresh(equipment)

        logger.info(
            f"Created equipment {equipment.id} ('{equipment.equipment_name}', {equipment.equipment_type}) "
            f"on farm '{farm.name}' by user {user_id}"
        )

        return cls._to_equipment_dto(equipment)

    @classmethod
    def list_equipment(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        equipment_type: Optional[str] = None,
        operational_status: Optional[str] = None,
        condition: Optional[str] = None,
        service_status_filter: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[EquipmentResponse]:
        """List equipment owned by user matching multi-criteria filters."""
        query = (
            db.query(Equipment)
            .join(Farm, Equipment.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
            .options(
                joinedload(Equipment.farm),
                joinedload(Equipment.field),
                selectinload(Equipment.maintenance_records),
            )
        )

        if farm_id:
            query = query.filter(Equipment.farm_id == farm_id)
        if field_id:
            query = query.filter(Equipment.field_id == field_id)
        if equipment_type:
            query = query.filter(func.lower(Equipment.equipment_type) == equipment_type.strip().lower())
        if operational_status:
            query = query.filter(Equipment.operational_status == operational_status.strip().lower())
        if condition:
            query = query.filter(Equipment.condition == condition.strip().lower())

        if search:
            term = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Equipment.equipment_name).ilike(term),
                    func.lower(Equipment.equipment_type).ilike(term),
                    func.lower(Equipment.brand).ilike(term),
                    func.lower(Equipment.model_number).ilike(term),
                    func.lower(Equipment.serial_number).ilike(term),
                    func.lower(Equipment.identification_number).ilike(term),
                    func.lower(Equipment.supplier_name).ilike(term),
                )
            )

        items = query.order_by(desc(Equipment.created_at)).all()
        today = date.today()

        # In-memory post-filter for service status if requested
        results: List[EquipmentResponse] = []
        for eq in items:
            dto = cls._to_equipment_dto(eq)
            if service_status_filter:
                stat = service_status_filter.strip().lower()
                if stat == "overdue" and dto.service_status != "overdue":
                    continue
                elif stat == "upcoming" and dto.service_status not in ("upcoming", "due_soon"):
                    continue
                elif stat == "due_soon" and dto.service_status != "due_soon":
                    continue
                elif stat == "missing_date" and dto.service_status != "not_scheduled":
                    continue
                elif stat == "under_maintenance" and eq.operational_status != "under_maintenance":
                    continue
                elif stat == "retired" and eq.operational_status != "retired":
                    continue
            results.append(dto)

        return results

    @classmethod
    def get_equipment_by_id(
        cls, db: Session, equipment_id: UUID, user_id: UUID
    ) -> EquipmentResponse:
        """Retrieve single equipment record by UUID."""
        equipment = cls._get_equipment_for_user(db=db, equipment_id=equipment_id, user_id=user_id)
        return cls._to_equipment_dto(equipment, include_maintenance=True)

    @classmethod
    def update_equipment(
        cls, db: Session, equipment_id: UUID, payload: EquipmentUpdate, user_id: UUID
    ) -> EquipmentResponse:
        """Update equipment specifications, location, or schedules."""
        equipment = cls._get_equipment_for_user(db=db, equipment_id=equipment_id, user_id=user_id)

        target_farm_id = payload.farm_id or equipment.farm_id
        if payload.farm_id and payload.farm_id != equipment.farm_id:
            cls._validate_farm_ownership(db=db, farm_id=payload.farm_id, user_id=user_id)
            equipment.farm_id = payload.farm_id

        if payload.field_id is not None:
            if payload.field_id:
                cls._validate_field_plot(db=db, field_id=payload.field_id, farm_id=target_farm_id)
                equipment.field_id = payload.field_id
            else:
                equipment.field_id = None

        fields_to_update = [
            "equipment_name",
            "equipment_type",
            "brand",
            "model_number",
            "serial_number",
            "purchase_date",
            "purchase_price",
            "supplier_name",
            "quantity",
            "condition",
            "operational_status",
            "fuel_type",
            "identification_number",
            "warranty_expiry_date",
            "last_service_date",
            "next_service_date",
            "notes",
        ]

        for field in fields_to_update:
            val = getattr(payload, field, None)
            if val is not None:
                setattr(equipment, field, val)

        db.commit()
        db.refresh(equipment)

        logger.info(f"Updated equipment record {equipment_id} for user {user_id}")
        return cls._to_equipment_dto(equipment)

    @classmethod
    def update_equipment_status(
        cls, db: Session, equipment_id: UUID, payload: EquipmentStatusUpdate, user_id: UUID
    ) -> EquipmentResponse:
        """Quickly transition equipment operational status and physical condition."""
        equipment = cls._get_equipment_for_user(db=db, equipment_id=equipment_id, user_id=user_id)

        equipment.operational_status = payload.operational_status
        if payload.condition:
            equipment.condition = payload.condition
        if payload.notes:
            existing = equipment.notes or ""
            equipment.notes = f"{existing}\n[Status updated to {payload.operational_status}]: {payload.notes}".strip()

        db.commit()
        db.refresh(equipment)

        logger.info(
            f"Changed operational status of equipment {equipment_id} to '{equipment.operational_status}'"
        )
        return cls._to_equipment_dto(equipment)

    @classmethod
    def delete_equipment(
        cls, db: Session, equipment_id: UUID, user_id: UUID, force: bool = False
    ) -> EquipmentDeleteResponse:
        """
        Safely delete equipment record.
        If maintenance history exists and force is False, deletion is rejected to protect history.
        """
        equipment = cls._get_equipment_for_user(db=db, equipment_id=equipment_id, user_id=user_id)

        maint_count = len(equipment.maintenance_records or [])
        if maint_count > 0 and not force:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot permanently delete equipment '{equipment.equipment_name}' because "
                    f"it has {maint_count} recorded maintenance history entries. "
                    f"Please change its operational status to 'retired' to preserve historical records, "
                    f"or confirm permanent deletion."
                ),
            )

        eq_name = equipment.equipment_name
        db.delete(equipment)
        db.commit()

        logger.info(f"Deleted equipment {equipment_id} ('{eq_name}') by user {user_id}")
        return EquipmentDeleteResponse(
            id=equipment_id,
            deleted=True,
            message=f"Equipment '{eq_name}' was successfully removed.",
        )

    # =========================================================================
    # Maintenance CRUD
    # =========================================================================

    @classmethod
    def create_maintenance_record(
        cls,
        db: Session,
        equipment_id: UUID,
        payload: EquipmentMaintenanceCreate,
        user_id: UUID,
    ) -> EquipmentMaintenanceResponse:
        """Record servicing or repair for an equipment item."""
        # 1. Verify equipment ownership
        equipment = cls._get_equipment_for_user(db=db, equipment_id=equipment_id, user_id=user_id)

        # 2. Create maintenance record
        record = EquipmentMaintenance(
            equipment_id=equipment_id,
            maintenance_type=payload.maintenance_type,
            service_date=payload.service_date,
            description=payload.description,
            service_provider=payload.service_provider,
            parts_replaced=payload.parts_replaced,
            cost=payload.cost,
            downtime_minutes=payload.downtime_minutes,
            next_service_date=payload.next_service_date,
            notes=payload.notes,
        )
        db.add(record)

        # 3. Synchronize service dates on equipment
        if equipment.last_service_date is None or payload.service_date >= equipment.last_service_date:
            equipment.last_service_date = payload.service_date

        if payload.next_service_date is not None:
            equipment.next_service_date = payload.next_service_date

        # 4. Optional status update
        if payload.update_equipment_status:
            equipment.operational_status = payload.update_equipment_status

        db.commit()
        db.refresh(record)

        logger.info(
            f"Created maintenance {record.id} ({record.maintenance_type}) for equipment {equipment_id}"
        )
        return cls._to_maintenance_dto(record)

    @classmethod
    def list_maintenance_records(
        cls,
        db: Session,
        equipment_id: UUID,
        user_id: UUID,
        maintenance_type: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[EquipmentMaintenanceResponse]:
        """List maintenance history for an equipment item."""
        # Verify equipment belongs to user
        cls._get_equipment_for_user(db=db, equipment_id=equipment_id, user_id=user_id)

        query = (
            db.query(EquipmentMaintenance)
            .filter(EquipmentMaintenance.equipment_id == equipment_id)
            .options(joinedload(EquipmentMaintenance.equipment).joinedload(Equipment.farm))
        )

        if maintenance_type:
            query = query.filter(EquipmentMaintenance.maintenance_type == maintenance_type.strip().lower())
        if start_date:
            query = query.filter(EquipmentMaintenance.service_date >= start_date)
        if end_date:
            query = query.filter(EquipmentMaintenance.service_date <= end_date)

        records = query.order_by(desc(EquipmentMaintenance.service_date)).all()
        return [cls._to_maintenance_dto(r) for r in records]

    @classmethod
    def get_maintenance_record_by_id(
        cls, db: Session, maintenance_id: UUID, user_id: UUID
    ) -> EquipmentMaintenanceResponse:
        """Get single maintenance record by UUID."""
        record = cls._get_maintenance_for_user(db=db, maintenance_id=maintenance_id, user_id=user_id)
        return cls._to_maintenance_dto(record)

    @classmethod
    def update_maintenance_record(
        cls,
        db: Session,
        maintenance_id: UUID,
        payload: EquipmentMaintenanceUpdate,
        user_id: UUID,
    ) -> EquipmentMaintenanceResponse:
        """Update an existing maintenance record and recalculate equipment dates."""
        record = cls._get_maintenance_for_user(db=db, maintenance_id=maintenance_id, user_id=user_id)
        equipment = record.equipment

        fields_to_update = [
            "maintenance_type",
            "service_date",
            "description",
            "service_provider",
            "parts_replaced",
            "cost",
            "downtime_minutes",
            "next_service_date",
            "notes",
        ]

        for field in fields_to_update:
            val = getattr(payload, field, None)
            if val is not None:
                setattr(record, field, val)

        # Re-evaluate latest service date on equipment
        db.flush()
        latest_service = (
            db.query(func.max(EquipmentMaintenance.service_date))
            .filter(EquipmentMaintenance.equipment_id == equipment.id)
            .scalar()
        )
        if latest_service:
            equipment.last_service_date = latest_service

        if payload.next_service_date is not None:
            equipment.next_service_date = payload.next_service_date

        db.commit()
        db.refresh(record)

        logger.info(f"Updated maintenance record {maintenance_id} for user {user_id}")
        return cls._to_maintenance_dto(record)

    @classmethod
    def delete_maintenance_record(
        cls, db: Session, maintenance_id: UUID, user_id: UUID
    ) -> Dict[str, Any]:
        """Delete a single maintenance record and update equipment service dates."""
        record = cls._get_maintenance_for_user(db=db, maintenance_id=maintenance_id, user_id=user_id)
        equipment = record.equipment
        eq_id = equipment.id

        db.delete(record)
        db.flush()

        # Re-sync equipment last_service_date
        latest_service = (
            db.query(func.max(EquipmentMaintenance.service_date))
            .filter(EquipmentMaintenance.equipment_id == eq_id)
            .scalar()
        )
        equipment.last_service_date = latest_service

        db.commit()

        logger.info(f"Deleted maintenance record {maintenance_id} for user {user_id}")
        return {
            "id": maintenance_id,
            "deleted": True,
            "message": "Maintenance record was successfully deleted.",
        }

    # =========================================================================
    # Dashboard & Cost Summaries
    # =========================================================================

    @classmethod
    def get_summary(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
    ) -> EquipmentSummaryResponse:
        """
        Aggregate authoritative equipment statistics and maintenance costs.
        Uses Python Decimal for exact monetary computations.
        """
        query = (
            db.query(Equipment)
            .join(Farm, Equipment.farm_id == Farm.id)
            .filter(Farm.user_id == user_id)
            .options(selectinload(Equipment.maintenance_records))
        )

        if farm_id:
            query = query.filter(Equipment.farm_id == farm_id)
        if field_id:
            query = query.filter(Equipment.field_id == field_id)

        equipment_list = query.all()
        today = date.today()

        total_equipment = len(equipment_list)
        available_count = 0
        in_use_count = 0
        under_maintenance_count = 0
        retired_count = 0
        upcoming_services_count = 0
        overdue_services_count = 0
        missing_service_date_count = 0

        total_purchase_val = Decimal("0.00")
        total_maintenance_expenditure = Decimal("0.00")

        by_type: Dict[str, int] = {}
        by_condition: Dict[str, int] = {}
        by_status: Dict[str, int] = {}

        for eq in equipment_list:
            # Status counts
            st = eq.operational_status
            by_status[st] = by_status.get(st, 0) + 1
            if st == "available":
                available_count += 1
            elif st == "in_use":
                in_use_count += 1
            elif st == "under_maintenance":
                under_maintenance_count += 1
            elif st == "retired":
                retired_count += 1

            # Condition counts
            cd = eq.condition
            by_condition[cd] = by_condition.get(cd, 0) + 1

            # Type counts
            tp = eq.equipment_type
            by_type[tp] = by_type.get(tp, 0) + 1

            # Service date evaluations (exclude retired from alert counts)
            if st != "retired":
                if not eq.next_service_date:
                    missing_service_date_count += 1
                elif eq.next_service_date < today:
                    overdue_services_count += 1
                elif eq.next_service_date <= today + timedelta(days=30):
                    upcoming_services_count += 1

            # Purchase value: Decimal calculation, excluding unknown (None) prices
            if eq.purchase_price is not None:
                total_purchase_val += Decimal(str(eq.purchase_price)) * Decimal(eq.quantity)

            # Maintenance costs from attached records
            for m in (eq.maintenance_records or []):
                if m.cost is not None:
                    total_maintenance_expenditure += Decimal(str(m.cost))

        return EquipmentSummaryResponse(
            total_equipment=total_equipment,
            available_count=available_count,
            in_use_count=in_use_count,
            under_maintenance_count=under_maintenance_count,
            retired_count=retired_count,
            upcoming_services_count=upcoming_services_count,
            overdue_services_count=overdue_services_count,
            missing_service_date_count=missing_service_date_count,
            total_purchase_value=total_purchase_val,
            total_maintenance_cost=total_maintenance_expenditure,
            by_type=by_type,
            by_condition=by_condition,
            by_status=by_status,
        )
