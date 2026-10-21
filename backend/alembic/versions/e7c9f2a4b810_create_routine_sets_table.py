"""create routine sets table

Revision ID: e7c9f2a4b810
Revises: c4e8d2a1b7f0
Create Date: 2026-10-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e7c9f2a4b810"
down_revision: Union[str, Sequence[str], None] = "c4e8d2a1b7f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "routine_sets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("routine_exercise_id", sa.Integer(), nullable=False),
        sa.Column("weight_kg", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("repetitions", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.CheckConstraint("repetitions > 0", name="check_routine_sets_repetitions"),
        sa.CheckConstraint(
            "weight_kg IS NULL OR (weight_kg > 0 AND weight_kg < 1000)",
            name="check_routine_sets_weight_kg",
        ),
        sa.CheckConstraint("position > 0", name="check_routine_sets_position"),
        sa.ForeignKeyConstraint(
            ["routine_exercise_id"], ["routine_exercises.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "routine_exercise_id", "position", name="uq_routine_sets_position"
        ),
    )
    op.create_index(
        op.f("ix_routine_sets_routine_exercise_id"),
        "routine_sets",
        ["routine_exercise_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_routine_sets_routine_exercise_id"), table_name="routine_sets"
    )
    op.drop_table("routine_sets")
