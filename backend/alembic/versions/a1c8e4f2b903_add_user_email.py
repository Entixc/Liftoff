"""Add required unique user email.

Revision ID: a1c8e4f2b903
Revises: f531b7d9c2a4
"""

from alembic import op
import sqlalchemy as sa


revision = "a1c8e4f2b903"
down_revision = "f531b7d9c2a4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email", sa.String(length=254), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_unique_constraint("uq_users_email", "users", ["email"])


def downgrade() -> None:
    op.drop_constraint("uq_users_email", "users", type_="unique")
    op.drop_column("users", "email_verified_at")
    op.drop_column("users", "email")
