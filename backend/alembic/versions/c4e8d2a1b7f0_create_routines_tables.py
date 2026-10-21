"""create routines tables

Revision ID: c4e8d2a1b7f0
Revises: 9a7b3c4d5e6f
Create Date: 2026-10-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4e8d2a1b7f0"
down_revision: Union[str, Sequence[str], None] = "9a7b3c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "routines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_routines_user_id"), "routines", ["user_id"])
    op.create_table(
        "routine_exercises",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("routine_id", sa.Integer(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.CheckConstraint("position > 0", name="check_routine_exercises_position"),
        sa.ForeignKeyConstraint(["routine_id"], ["routines.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("routine_id", "exercise_id", name="uq_routine_exercises_exercise"),
        sa.UniqueConstraint("routine_id", "position", name="uq_routine_exercises_position"),
    )
    op.create_index(op.f("ix_routine_exercises_routine_id"), "routine_exercises", ["routine_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_routine_exercises_routine_id"), table_name="routine_exercises")
    op.drop_table("routine_exercises")
    op.drop_index(op.f("ix_routines_user_id"), table_name="routines")
    op.drop_table("routines")
