import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException, Request, status

from app.core.config import get_cors_origins
from app.models.user_session import UserSession


SESSION_COOKIE_NAME = "liftoff_session"
SESSION_IDLE_TIMEOUT = timedelta(days=14)
SESSION_ABSOLUTE_TIMEOUT = timedelta(days=30)
SESSION_ACTIVITY_WRITE_INTERVAL = timedelta(hours=1)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(db: Session, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    db.add(UserSession(
        user_id=user_id,
        token_hash=hash_session_token(token),
        last_seen_at=now,
        expires_at=now + SESSION_ABSOLUTE_TIMEOUT,
    ))
    db.commit()
    return token


def get_session(db: Session, token: str) -> UserSession | None:
    if not token:
        return None
    row = db.scalar(select(UserSession).where(UserSession.token_hash == hash_session_token(token)))
    if row is None:
        return None
    now = datetime.now(timezone.utc)
    last_seen = row.last_seen_at.replace(tzinfo=timezone.utc) if row.last_seen_at.tzinfo is None else row.last_seen_at
    expires = row.expires_at.replace(tzinfo=timezone.utc) if row.expires_at.tzinfo is None else row.expires_at
    if now >= expires or now - last_seen >= SESSION_IDLE_TIMEOUT:
        db.delete(row)
        db.commit()
        return None
    if now - last_seen >= SESSION_ACTIVITY_WRITE_INTERVAL:
        row.last_seen_at = now
        db.commit()
    return row


def revoke_session(db: Session, token: str) -> None:
    row = db.scalar(select(UserSession).where(UserSession.token_hash == hash_session_token(token)))
    if row is not None:
        db.delete(row)
        db.commit()


def require_trusted_origin(request: Request) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return
    origin = request.headers.get("origin")
    allowed = set(get_cors_origins()) | {str(request.base_url).rstrip("/")}
    if origin not in allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Untrusted request origin")
