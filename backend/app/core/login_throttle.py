import math
from datetime import datetime, timedelta, timezone

from fastapi import Request
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.login_attempt import LoginAttempt


LOGIN_ATTEMPT_WINDOW = timedelta(minutes=15)
PAIR_FAILURE_LIMIT = 5
IP_FAILURE_LIMIT = 50


def client_ip(request: Request) -> str:
    return request.client.host if request.client is not None else "unknown"


def nickname_key(nickname: str) -> str:
    return nickname.strip().casefold()


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _retry_after(oldest: datetime | None, now: datetime) -> int:
    if oldest is None:
        return 1
    remaining = _as_utc(oldest) + LOGIN_ATTEMPT_WINDOW - now
    return max(1, math.ceil(remaining.total_seconds()))


def login_retry_after(
    db: Session,
    ip_address: str,
    identifier: str,
    *,
    now: datetime | None = None,
) -> int | None:
    current_time = now or datetime.now(timezone.utc)
    cutoff = current_time - LOGIN_ATTEMPT_WINDOW
    pair_count, pair_oldest = db.execute(
        select(func.count(), func.min(LoginAttempt.failed_at)).where(
            LoginAttempt.client_ip == ip_address,
            LoginAttempt.nickname_key == identifier,
            LoginAttempt.failed_at >= cutoff,
        )
    ).one()
    ip_count, ip_oldest = db.execute(
        select(func.count(), func.min(LoginAttempt.failed_at)).where(
            LoginAttempt.client_ip == ip_address,
            LoginAttempt.failed_at >= cutoff,
        )
    ).one()

    waits: list[int] = []
    if pair_count >= PAIR_FAILURE_LIMIT:
        waits.append(_retry_after(pair_oldest, current_time))
    if ip_count >= IP_FAILURE_LIMIT:
        waits.append(_retry_after(ip_oldest, current_time))
    return max(waits) if waits else None


def record_login_failure(
    db: Session,
    ip_address: str,
    identifier: str,
) -> int | None:
    now = datetime.now(timezone.utc)
    db.execute(
        delete(LoginAttempt).where(
            LoginAttempt.failed_at < now - LOGIN_ATTEMPT_WINDOW
        )
    )
    db.add(
        LoginAttempt(
            client_ip=ip_address,
            nickname_key=identifier,
            failed_at=now,
        )
    )
    db.commit()
    return login_retry_after(db, ip_address, identifier, now=now)


def clear_login_failures(
    db: Session,
    ip_address: str,
    identifier: str,
) -> None:
    now = datetime.now(timezone.utc)
    db.execute(
        delete(LoginAttempt).where(
            (LoginAttempt.failed_at < now - LOGIN_ATTEMPT_WINDOW)
            | (
                (LoginAttempt.client_ip == ip_address)
                & (LoginAttempt.nickname_key == identifier)
            )
        )
    )
    db.commit()
