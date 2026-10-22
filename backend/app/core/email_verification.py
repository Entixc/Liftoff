import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.email_verification_token import EmailVerificationToken


EMAIL_VERIFICATION_TTL = timedelta(hours=24)
EMAIL_VERIFICATION_RESEND_COOLDOWN = timedelta(minutes=1)


def hash_email_verification_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def issue_email_verification_token(
    db: Session,
    user_id: int,
    *,
    now: datetime | None = None,
) -> str:
    issued_at = now or datetime.now(timezone.utc)
    token = secrets.token_urlsafe(32)
    db.execute(
        delete(EmailVerificationToken).where(
            EmailVerificationToken.user_id == user_id
        )
    )
    db.add(
        EmailVerificationToken(
            user_id=user_id,
            token_hash=hash_email_verification_token(token),
            created_at=issued_at,
            expires_at=issued_at + EMAIL_VERIFICATION_TTL,
        )
    )
    return token


def get_email_verification_token(
    db: Session,
    token: str,
) -> EmailVerificationToken | None:
    return db.scalar(
        select(EmailVerificationToken).where(
            EmailVerificationToken.token_hash
            == hash_email_verification_token(token)
        )
    )


def verification_resend_retry_after(
    db: Session,
    user_id: int,
    *,
    now: datetime | None = None,
) -> int | None:
    token = db.scalar(
        select(EmailVerificationToken).where(
            EmailVerificationToken.user_id == user_id
        )
    )
    if token is None:
        return None
    current_time = now or datetime.now(timezone.utc)
    available_at = as_utc(token.created_at) + EMAIL_VERIFICATION_RESEND_COOLDOWN
    if current_time >= available_at:
        return None
    return max(1, int((available_at - current_time).total_seconds()) + 1)
