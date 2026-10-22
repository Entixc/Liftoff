"""Add exercise instructions and detailed muscle roles.

Revision ID: b47d92c1a660
Revises: a39f2c6e1b74
"""

from alembic import op
import sqlalchemy as sa


revision = "b47d92c1a660"
down_revision = "a39f2c6e1b74"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exercises", sa.Column("description_en", sa.Text(), nullable=False, server_default=""))
    op.create_table(
        "muscles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(50), nullable=False, unique=True),
        sa.Column("name_en", sa.String(80), nullable=False),
    )
    op.create_table(
        "exercise_muscles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exercise_id", sa.Integer(), sa.ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False),
        sa.Column("muscle_id", sa.Integer(), sa.ForeignKey("muscles.id"), nullable=False),
        sa.Column("role", sa.String(12), nullable=False),
        sa.CheckConstraint("role IN ('primary', 'secondary')", name="check_exercise_muscles_role"),
        sa.UniqueConstraint("exercise_id", "muscle_id", name="uq_exercise_muscles_pair"),
    )
    op.create_index("ix_exercise_muscles_exercise_id", "exercise_muscles", ["exercise_id"])
    op.create_index("ix_exercise_muscles_muscle_id", "exercise_muscles", ["muscle_id"])


def downgrade() -> None:
    op.drop_index("ix_exercise_muscles_muscle_id", table_name="exercise_muscles")
    op.drop_index("ix_exercise_muscles_exercise_id", table_name="exercise_muscles")
    op.drop_table("exercise_muscles")
    op.drop_table("muscles")
    op.drop_column("exercises", "description_en")
