"""Harvest service layer managing business logic, tenant isolation, and yield metrics."""

from datetime import date
from decimal import Decimal
from typing import Optional, List, Dict, Tuple, Any
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_, desc
from fastapi import HTTPException, status

from app.models.harvest import Harvest, HARVEST_UNITS, QUALITY_GRADES
from app.models.crop import Crop
from app.models.field import Field
from app.models.farm import Farm
from app.schemas.harvest import (
    HarvestCreate,
    HarvestUpdate,
    HarvestResponse,
    HarvestSummaryResponse,
    CropHarvestSummary,
    FieldHarvestSummary,
    HarvestDeleteResponse,
)

# Standard metric conversion factors to kilograms
METRIC_CONVERSION_TO_KG = {
    "kg": Decimal("1.00"),
    "quintals": Decimal("100.00"),
    "tonnes": Decimal("1000.00"),
    "grams": Decimal("0.001"),
}


class HarvestService:
    """Service handling multi-tenant harvest tracking and produce aggregation."""

    @staticmethod
    def _validate_hierarchy(
        db: Session,
        user_id: UUID,
        crop_id: UUID,
        field_id: Optional[UUID] = None,
        farm_id: Optional[UUID] = None,
    ) -> Tuple[Farm, Field, Crop]:
        """Validate that the crop exists, belongs to the field and farm, and is owned by the user."""
        crop = (
            db.query(Crop)
            .join(Field, Crop.field_id == Field.id)
            .join(Farm, Field.farm_id == Farm.id)
            .filter(Crop.id == crop_id)
            .first()
        )

        if not crop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Crop with ID {crop_id} not found.",
            )

        field = crop.field
        farm = field.farm

        # Verify user ownership of the farm
        if farm.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access resources on this farm.",
            )

        # If field_id was explicitly provided, verify it matches the crop's field
        if field_id and field_id != field.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Crop '{crop.name}' belongs to field '{field.name}' ({field.id}), not the specified field ({field_id}).",
            )

        # If farm_id was explicitly provided, verify it matches the field's farm
        if farm_id and farm_id != farm.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Field '{field.name}' belongs to farm '{farm.name}' ({farm.id}), not the specified farm ({farm_id}).",
            )

        return farm, field, crop

    @classmethod
    def create_harvest(
        cls, db: Session, user_id: UUID, harvest_in: HarvestCreate
    ) -> HarvestResponse:
        """Create a new harvest record with verified farm/field/crop hierarchy."""
        farm, field, crop = cls._validate_hierarchy(
            db=db,
            user_id=user_id,
            crop_id=harvest_in.crop_id,
            field_id=harvest_in.field_id,
            farm_id=harvest_in.farm_id,
        )

        harvest = Harvest(
            farm_id=farm.id,
            field_id=field.id,
            crop_id=crop.id,
            harvest_date=harvest_in.harvest_date,
            quantity=harvest_in.quantity,
            unit=harvest_in.unit,
            quality_grade=harvest_in.quality_grade or "Standard",
            harvest_method=harvest_in.harvest_method,
            storage_location=harvest_in.storage_location,
            batch_number=harvest_in.batch_number,
            notes=harvest_in.notes,
        )

        db.add(harvest)

        # Update crop actual_harvest_date if empty or earlier
        if not crop.actual_harvest_date or crop.actual_harvest_date < harvest_in.harvest_date:
            crop.actual_harvest_date = harvest_in.harvest_date

        db.commit()
        db.refresh(harvest)

        return cls._to_response(harvest, farm.name, field.name, crop.name, crop.variety)

    @classmethod
    def get_harvests(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        crop_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        unit: Optional[str] = None,
        quality_grade: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[HarvestResponse], int]:
        """Retrieve paginated harvest records for the user with multi-attribute filtering."""
        query = (
            db.query(Harvest)
            .join(Farm, Harvest.farm_id == Farm.id)
            .join(Field, Harvest.field_id == Field.id)
            .join(Crop, Harvest.crop_id == Crop.id)
            .filter(Farm.user_id == user_id)
        )

        if farm_id:
            query = query.filter(Harvest.farm_id == farm_id)
        if field_id:
            query = query.filter(Harvest.field_id == field_id)
        if crop_id:
            query = query.filter(Harvest.crop_id == crop_id)
        if start_date:
            query = query.filter(Harvest.harvest_date >= start_date)
        if end_date:
            query = query.filter(Harvest.harvest_date <= end_date)
        if unit:
            query = query.filter(func.lower(Harvest.unit) == unit.strip().lower())
        if quality_grade:
            query = query.filter(Harvest.quality_grade == quality_grade)
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Crop.name.ilike(search_term),
                    Crop.variety.ilike(search_term),
                    Harvest.storage_location.ilike(search_term),
                    Harvest.batch_number.ilike(search_term),
                    Harvest.notes.ilike(search_term),
                )
            )

        total_count = query.count()
        harvests = (
            query.order_by(desc(Harvest.harvest_date), desc(Harvest.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

        results = [
            cls._to_response(h, h.farm.name, h.field.name, h.crop.name, h.crop.variety)
            for h in harvests
        ]
        return results, total_count

    @classmethod
    def get_harvest_by_id(cls, db: Session, user_id: UUID, harvest_id: UUID) -> HarvestResponse:
        """Fetch a single harvest record by ID with authorization verification."""
        harvest = (
            db.query(Harvest)
            .join(Farm, Harvest.farm_id == Farm.id)
            .join(Field, Harvest.field_id == Field.id)
            .join(Crop, Harvest.crop_id == Crop.id)
            .filter(Harvest.id == harvest_id)
            .first()
        )

        if not harvest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Harvest record {harvest_id} not found.",
            )

        if harvest.farm.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this harvest record.",
            )

        return cls._to_response(
            harvest, harvest.farm.name, harvest.field.name, harvest.crop.name, harvest.crop.variety
        )

    @classmethod
    def update_harvest(
        cls, db: Session, user_id: UUID, harvest_id: UUID, harvest_in: HarvestUpdate
    ) -> HarvestResponse:
        """Update an existing harvest record with revalidated hierarchy."""
        harvest = (
            db.query(Harvest)
            .join(Farm, Harvest.farm_id == Farm.id)
            .join(Field, Harvest.field_id == Field.id)
            .join(Crop, Harvest.crop_id == Crop.id)
            .filter(Harvest.id == harvest_id)
            .first()
        )

        if not harvest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Harvest record {harvest_id} not found.",
            )

        if harvest.farm.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to edit this harvest record.",
            )

        target_crop_id = harvest_in.crop_id or harvest.crop_id
        target_field_id = harvest_in.field_id or harvest.field_id
        target_farm_id = harvest_in.farm_id or harvest.farm_id

        # Revalidate hierarchy if any relational link changed
        if (
            target_crop_id != harvest.crop_id
            or target_field_id != harvest.field_id
            or target_farm_id != harvest.farm_id
        ):
            farm, field, crop = cls._validate_hierarchy(
                db=db,
                user_id=user_id,
                crop_id=target_crop_id,
                field_id=target_field_id,
                farm_id=target_farm_id,
            )
            harvest.farm_id = farm.id
            harvest.field_id = field.id
            harvest.crop_id = crop.id

        if harvest_in.harvest_date is not None:
            harvest.harvest_date = harvest_in.harvest_date
        if harvest_in.quantity is not None:
            harvest.quantity = harvest_in.quantity
        if harvest_in.unit is not None:
            harvest.unit = harvest_in.unit
        if harvest_in.quality_grade is not None:
            harvest.quality_grade = harvest_in.quality_grade
        if harvest_in.harvest_method is not None:
            harvest.harvest_method = harvest_in.harvest_method
        if harvest_in.storage_location is not None:
            harvest.storage_location = harvest_in.storage_location
        if harvest_in.batch_number is not None:
            harvest.batch_number = harvest_in.batch_number
        if harvest_in.notes is not None:
            harvest.notes = harvest_in.notes

        db.commit()
        db.refresh(harvest)

        return cls._to_response(
            harvest, harvest.farm.name, harvest.field.name, harvest.crop.name, harvest.crop.variety
        )

    @classmethod
    def delete_harvest(cls, db: Session, user_id: UUID, harvest_id: UUID) -> HarvestDeleteResponse:
        """Safely delete a harvest record without affecting parent crop, field, or farm."""
        harvest = (
            db.query(Harvest)
            .join(Farm, Harvest.farm_id == Farm.id)
            .filter(Harvest.id == harvest_id)
            .first()
        )

        if not harvest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Harvest record {harvest_id} not found.",
            )

        if harvest.farm.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this harvest record.",
            )

        db.delete(harvest)
        db.commit()

        return HarvestDeleteResponse(
            id=harvest_id,
            deleted=True,
            message="Harvest record successfully deleted.",
        )

    @classmethod
    def get_harvest_summary(
        cls,
        db: Session,
        user_id: UUID,
        farm_id: Optional[UUID] = None,
        field_id: Optional[UUID] = None,
        crop_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> HarvestSummaryResponse:
        """Compute authoritative yield aggregations, strictly distinguishing metric from discrete units."""
        query = (
            db.query(Harvest)
            .join(Farm, Harvest.farm_id == Farm.id)
            .join(Field, Harvest.field_id == Field.id)
            .join(Crop, Harvest.crop_id == Crop.id)
            .filter(Farm.user_id == user_id)
        )

        if farm_id:
            query = query.filter(Harvest.farm_id == farm_id)
        if field_id:
            query = query.filter(Harvest.field_id == field_id)
        if crop_id:
            query = query.filter(Harvest.crop_id == crop_id)
        if start_date:
            query = query.filter(Harvest.harvest_date >= start_date)
        if end_date:
            query = query.filter(Harvest.harvest_date <= end_date)

        all_harvests = query.all()

        total_harvests = len(all_harvests)
        total_metric_weight_kg = Decimal("0.00")
        by_unit: Dict[str, Decimal] = {}
        by_quality_grade: Dict[str, int] = {}

        # Crop-wise and field-wise trackers
        crop_buckets: Dict[UUID, Dict[str, Any]] = {}
        field_buckets: Dict[UUID, Dict[str, Any]] = {}

        for h in all_harvests:
            unit_norm = h.unit.strip().lower()
            qty = Decimal(str(h.quantity))

            # 1. Discrete/exact unit sum
            by_unit[unit_norm] = by_unit.get(unit_norm, Decimal("0.00")) + qty

            # 2. Metric conversion if mathematically valid
            if unit_norm in METRIC_CONVERSION_TO_KG:
                weight_in_kg = qty * METRIC_CONVERSION_TO_KG[unit_norm]
                total_metric_weight_kg += weight_in_kg
            else:
                weight_in_kg = None

            # 3. Quality grade distribution
            grade = h.quality_grade or "Not specified"
            by_quality_grade[grade] = by_quality_grade.get(grade, 0) + 1

            # 4. Crop-wise aggregation
            if h.crop_id not in crop_buckets:
                crop_buckets[h.crop_id] = {
                    "crop_id": h.crop_id,
                    "crop_name": h.crop.name,
                    "crop_variety": h.crop.variety,
                    "harvest_count": 0,
                    "quantities_by_unit": {},
                    "metric_weight_kg": Decimal("0.00"),
                }
            c_entry = crop_buckets[h.crop_id]
            c_entry["harvest_count"] += 1
            c_entry["quantities_by_unit"][unit_norm] = (
                c_entry["quantities_by_unit"].get(unit_norm, Decimal("0.00")) + qty
            )
            if weight_in_kg is not None:
                c_entry["metric_weight_kg"] += weight_in_kg

            # 5. Field-wise aggregation
            if h.field_id not in field_buckets:
                field_buckets[h.field_id] = {
                    "field_id": h.field_id,
                    "field_name": h.field.name,
                    "harvest_count": 0,
                    "quantities_by_unit": {},
                    "metric_weight_kg": Decimal("0.00"),
                }
            f_entry = field_buckets[h.field_id]
            f_entry["harvest_count"] += 1
            f_entry["quantities_by_unit"][unit_norm] = (
                f_entry["quantities_by_unit"].get(unit_norm, Decimal("0.00")) + qty
            )
            if weight_in_kg is not None:
                f_entry["metric_weight_kg"] += weight_in_kg

        crop_summaries = [
            CropHarvestSummary(
                crop_id=d["crop_id"],
                crop_name=d["crop_name"],
                crop_variety=d["crop_variety"],
                harvest_count=d["harvest_count"],
                quantities_by_unit=d["quantities_by_unit"],
                metric_weight_kg=d["metric_weight_kg"].quantize(Decimal("0.01")),
            )
            for d in crop_buckets.values()
        ]

        field_summaries = [
            FieldHarvestSummary(
                field_id=d["field_id"],
                field_name=d["field_name"],
                harvest_count=d["harvest_count"],
                quantities_by_unit=d["quantities_by_unit"],
                metric_weight_kg=d["metric_weight_kg"].quantize(Decimal("0.01")),
            )
            for d in field_buckets.values()
        ]

        return HarvestSummaryResponse(
            total_harvests=total_harvests,
            total_metric_weight_kg=total_metric_weight_kg.quantize(Decimal("0.01")),
            by_unit={u: q.quantize(Decimal("0.01")) for u, q in by_unit.items()},
            by_quality_grade=by_quality_grade,
            by_crop=crop_summaries,
            by_field=field_summaries,
            start_date=start_date,
            end_date=end_date,
        )

    @staticmethod
    def _to_response(
        h: Harvest, farm_name: str, field_name: str, crop_name: str, crop_variety: str
    ) -> HarvestResponse:
        """Serialize Harvest model to response schema with populated related names."""
        return HarvestResponse(
            id=h.id,
            farm_id=h.farm_id,
            farm_name=farm_name,
            field_id=h.field_id,
            field_name=field_name,
            crop_id=h.crop_id,
            crop_name=crop_name,
            crop_variety=crop_variety,
            harvest_date=h.harvest_date,
            quantity=h.quantity,
            unit=h.unit,
            quality_grade=h.quality_grade,
            harvest_method=h.harvest_method,
            storage_location=h.storage_location,
            batch_number=h.batch_number,
            notes=h.notes,
            created_at=h.created_at,
            updated_at=h.updated_at,
        )
