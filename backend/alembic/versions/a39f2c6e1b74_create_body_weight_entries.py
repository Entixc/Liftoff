"""Create body weight history.

Revision ID: a39f2c6e1b74
Revises: e7c9f2a4b810
"""

from alembic import op
import sqlalchemy as sa


revision = "a39f2c6e1b74"
down_revision = "e7c9f2a4b810"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "body_weight_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("weight_kg", sa.Numeric(5, 2), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_body_weight_entries_user_id", "body_weight_entries", ["user_id"])
    op.execute(
        "INSERT INTO body_weight_entries (user_id, weight_kg, recorded_at) "
        "SELECT id, body_weight_kg, CURRENT_TIMESTAMP FROM users "
        "WHERE body_weight_kg IS NOT NULL"
    )


def downgrade() -> None:
    op.drop_index("ix_body_weight_entries_user_id", table_name="body_weight_entries")
    op.drop_table("body_weight_entries")
