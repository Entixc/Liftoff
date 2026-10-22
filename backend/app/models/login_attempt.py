from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    __table_args__ = (
        Index(
            "ix_login_attempts_ip_nickname_failed_at",
            "client_ip",
            "nickname_key",
            "failed_at",
        ),
        Index("ix_login_attempts_ip_failed_at", "client_ip", "failed_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    nickname_key: Mapped[str] = mapped_column(String(50), nullable=False)
    failed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
