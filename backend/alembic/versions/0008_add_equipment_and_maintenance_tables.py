"""Add equipment and equipment_maintenance tables for Phase 13

Revision ID: 0008_add_equipment_and_maintenance_tables
Revises: 0007_add_expenses_and_payments_tables
Create Date: 2026-10-19 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0008_add_equipment_and_maintenance_tables"
down_revision: Union[str, None] = "0007_add_expenses_and_payments_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create equipment table
    op.create_table(
        "equipment",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=False),
        sa.Column("field_id", sa.Uuid(), nullable=True),
        sa.Column("equipment_name", sa.String(length=150), nullable=False),
        sa.Column("equipment_type", sa.String(length=60), nullable=False),
        sa.Column("brand", sa.String(length=100), nullable=True),
        sa.Column("model_number", sa.String(length=100), nullable=True),
        sa.Column("serial_number", sa.String(length=100), nullable=True),
        sa.Column("purchase_date", sa.Date(), nullable=True),
        sa.Column("purchase_price", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("supplier_name", sa.String(length=150), nullable=True),
        sa.Column("quantity", sa.Integer(), server_default="1", nullable=False),
        sa.Column("condition", sa.String(length=30), server_default="good", nullable=False),
        sa.Column("operational_status", sa.String(length=30), server_default="available", nullable=False),
        sa.Column("fuel_type", sa.String(length=50), nullable=True),
        sa.Column("identification_number", sa.String(length=100), nullable=True),
        sa.Column("warranty_expiry_date", sa.Date(), nullable=True),
        sa.Column("last_service_date", sa.Date(), nullable=True),
        sa.Column("next_service_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["field_id"], ["fields.id"], ondelete="SET NULL"),
        sa.CheckConstraint("purchase_price IS NULL OR purchase_price >= 0", name="check_non_negative_purchase_price"),
        sa.CheckConstraint("quantity > 0", name="check_positive_equipment_quantity"),
        sa.CheckConstraint(
            "condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')",
            name="check_valid_equipment_condition",
        ),
        sa.CheckConstraint(
            "operational_status IN ('available', 'in_use', 'under_maintenance', 'retired')",
            name="check_valid_operational_status",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_equipment_id"), "equipment", ["id"], unique=False)
    op.create_index(op.f("ix_equipment_farm_id"), "equipment", ["farm_id"], unique=False)
    op.create_index(op.f("ix_equipment_field_id"), "equipment", ["field_id"], unique=False)
    op.create_index(op.f("ix_equipment_equipment_name"), "equipment", ["equipment_name"], unique=False)
    op.create_index(op.f("ix_equipment_equipment_type"), "equipment", ["equipment_type"], unique=False)
    op.create_index(op.f("ix_equipment_serial_number"), "equipment", ["serial_number"], unique=False)
    op.create_index(op.f("ix_equipment_condition"), "equipment", ["condition"], unique=False)
    op.create_index(op.f("ix_equipment_operational_status"), "equipment", ["operational_status"], unique=False)
    op.create_index(op.f("ix_equipment_next_service_date"), "equipment", ["next_service_date"], unique=False)

    # 2. Create equipment_maintenance table
    op.create_table(
        "equipment_maintenance",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("equipment_id", sa.Uuid(), nullable=False),
        sa.Column("maintenance_type", sa.String(length=50), nullable=False),
        sa.Column("service_date", sa.Date(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("service_provider", sa.String(length=150), nullable=True),
        sa.Column("parts_replaced", sa.Text(), nullable=True),
        sa.Column("cost", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("downtime_minutes", sa.Integer(), nullable=True),
        sa.Column("next_service_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["equipment_id"], ["equipment.id"], ondelete="CASCADE"),
        sa.CheckConstraint("cost IS NULL OR cost >= 0", name="check_non_negative_maintenance_cost"),
        sa.CheckConstraint("downtime_minutes IS NULL OR downtime_minutes >= 0", name="check_non_negative_downtime_minutes"),
        sa.CheckConstraint(
            "maintenance_type IN ('routine_service', 'preventive_maintenance', 'repair', 'inspection', 'parts_replacement', 'other')",
            name="check_valid_maintenance_type",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_equipment_maintenance_id"), "equipment_maintenance", ["id"], unique=False)
    op.create_index(op.f("ix_equipment_maintenance_equipment_id"), "equipment_maintenance", ["equipment_id"], unique=False)
    op.create_index(op.f("ix_equipment_maintenance_maintenance_type"), "equipment_maintenance", ["maintenance_type"], unique=False)
    op.create_index(op.f("ix_equipment_maintenance_service_date"), "equipment_maintenance", ["service_date"], unique=False)


def downgrade() -> None:
    # 1. Drop equipment_maintenance table
    op.drop_index(op.f("ix_equipment_maintenance_service_date"), table_name="equipment_maintenance")
    op.drop_index(op.f("ix_equipment_maintenance_maintenance_type"), table_name="equipment_maintenance")
    op.drop_index(op.f("ix_equipment_maintenance_equipment_id"), table_name="equipment_maintenance")
    op.drop_index(op.f("ix_equipment_maintenance_id"), table_name="equipment_maintenance")
    op.drop_table("equipment_maintenance")

    # 2. Drop equipment table
    op.drop_index(op.f("ix_equipment_next_service_date"), table_name="equipment")
    op.drop_index(op.f("ix_equipment_operational_status"), table_name="equipment")
    op.drop_index(op.f("ix_equipment_condition"), table_name="equipment")
    op.drop_index(op.f("ix_equipment_serial_number"), table_name="equipment")
    op.drop_index(op.f("ix_equipment_equipment_type"), table_name="equipment")
    op.drop_index(op.f("ix_equipment_equipment_name"), table_name="equipment")
    op.drop_index(op.f("ix_equipment_field_id"), table_name="equipment")
    op.drop_index(op.f("ix_equipment_farm_id"), table_name="equipment")
    op.drop_index(op.f("ix_equipment_id"), table_name="equipment")
    op.drop_table("equipment")
