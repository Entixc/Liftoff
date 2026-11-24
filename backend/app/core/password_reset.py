import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.email_verification import as_utc
from app.models.password_reset_token import PasswordResetToken


PASSWORD_RESET_TTL = timedelta(minutes=30)
PASSWORD_RESET_REQUEST_COOLDOWN = timedelta(minutes=1)


def hash_password_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_password_reset_token(
    db: Session,
    user_id: int,
    *,
    now: datetime | None = None,
) -> str:
    issued_at = now or datetime.now(timezone.utc)
    token = secrets.token_urlsafe(32)
    revoke_password_reset_tokens(db, user_id)
    db.add(
        PasswordResetToken(
            user_id=user_id,
            token_hash=hash_password_reset_token(token),
            created_at=issued_at,
            expires_at=issued_at + PASSWORD_RESET_TTL,
        )
    )
    return token


def get_password_reset_token(
    db: Session,
    token: str,
) -> PasswordResetToken | None:
    return db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == hash_password_reset_token(token)
        )
    )


def password_reset_retry_after(
    db: Session,
    user_id: int,
    *,
    now: datetime | None = None,
) -> int | None:
    token = db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.user_id == user_id)
    )
    if token is None:
        return None
    current_time = now or datetime.now(timezone.utc)
    available_at = as_utc(token.created_at) + PASSWORD_RESET_REQUEST_COOLDOWN
    if current_time >= available_at:
        return None
    return max(1, int((available_at - current_time).total_seconds()) + 1)


def revoke_password_reset_tokens(db: Session, user_id: int) -> None:
    db.execute(
        delete(PasswordResetToken).where(PasswordResetToken.user_id == user_id)
    )
