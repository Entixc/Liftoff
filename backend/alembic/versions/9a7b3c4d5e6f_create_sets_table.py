"""create sets table

Revision ID: 9a7b3c4d5e6f
Revises: 42c00237804b
Create Date: 2026-10-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9a7b3c4d5e6f"
down_revision: Union[str, Sequence[str], None] = "42c00237804b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workout_exercise_id", sa.Integer(), nullable=False),
        sa.Column("weight_kg", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("repetitions", sa.Integer(), nullable=False),
        sa.Column(
            "is_completed",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "position > 0",
            name="check_sets_position",
        ),
        sa.CheckConstraint(
            "repetitions > 0",
            name="check_sets_repetitions",
        ),
        sa.CheckConstraint(
            "weight_kg IS NULL OR (weight_kg > 0 AND weight_kg < 1000)",
            name="check_sets_weight_kg",
        ),
        sa.ForeignKeyConstraint(
            ["workout_exercise_id"],
            ["workout_exercises.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workout_exercise_id",
            "position",
            name="uq_sets_workout_exercise_position",
        ),
    )
    op.create_index(
        op.f("ix_sets_workout_exercise_id"),
        "sets",
        ["workout_exercise_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_sets_workout_exercise_id"),
        table_name="sets",
    )
    op.drop_table("sets")
