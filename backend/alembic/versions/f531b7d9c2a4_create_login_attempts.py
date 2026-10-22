"""Create persisted login attempts.

Revision ID: f531b7d9c2a4
Revises: d2195acb84e1
"""

from alembic import op
import sqlalchemy as sa


revision = "f531b7d9c2a4"
down_revision = "d2195acb84e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "login_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_ip", sa.String(45), nullable=False),
        sa.Column("nickname_key", sa.String(50), nullable=False),
        sa.Column(
            "failed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index(
        "ix_login_attempts_ip_nickname_failed_at",
        "login_attempts",
        ["client_ip", "nickname_key", "failed_at"],
    )
    op.create_index(
        "ix_login_attempts_ip_failed_at",
        "login_attempts",
        ["client_ip", "failed_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_login_attempts_ip_failed_at",
        table_name="login_attempts",
    )
    op.drop_index(
        "ix_login_attempts_ip_nickname_failed_at",
        table_name="login_attempts",
    )
    op.drop_table("login_attempts")
