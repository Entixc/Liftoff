from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.sessions import SESSION_COOKIE_NAME, hash_session_token
from app.app import app
from app.models.user_session import UserSession


ORIGIN = {"Origin": "http://localhost:5173", "X-Session-Client": "browser"}


def sign_in(client: TestClient) -> str:
    credentials = {
        "nickname": "nurzhan",
        "email": "nurzhan@example.com",
        "password": "strongpass",
    }
    client.post("/auth/register", json=credentials)
    response = client.post("/auth/login", json=credentials, headers=ORIGIN)
    assert response.status_code == 200
    assert response.json() == {"authenticated": True}
    cookie_header = response.headers["set-cookie"].lower()
    assert "httponly" in cookie_header
    assert "samesite=lax" in cookie_header
    return response.cookies[SESSION_COOKIE_NAME]


def test_browser_login_sets_opaque_httponly_cookie(client: TestClient, db_session: Session) -> None:
    token = sign_in(client)
    cookie_header = client.get("/auth/me").request.headers["cookie"]
    assert SESSION_COOKIE_NAME in cookie_header
    response = client.get("/auth/me")
    assert response.status_code == 200
    assert response.json()["nickname"] == "nurzhan"
    row = db_session.scalar(select(UserSession))
    assert row is not None
    assert row.token_hash == hash_session_token(token)
    assert token != row.token_hash


def test_session_rejects_untrusted_write_and_logout_revokes(client: TestClient, db_session: Session) -> None:
    sign_in(client)
    assert client.patch("/auth/me", json={"height_cm": 180}).status_code == 403
    assert client.patch("/auth/me", json={"height_cm": 180}, headers=ORIGIN).status_code == 200
    assert client.post("/auth/logout", headers=ORIGIN).status_code == 204
    assert client.get("/auth/me").status_code == 401
    assert db_session.scalar(select(UserSession)) is None


def test_idle_and_absolute_session_expiry(client: TestClient, db_session: Session) -> None:
    sign_in(client)
    row = db_session.scalar(select(UserSession))
    assert row is not None
    row.last_seen_at = datetime.now(timezone.utc) - timedelta(days=15)
    db_session.commit()
    assert client.get("/auth/me").status_code == 401

    client.cookies.clear()
    credentials = {
        "nickname": "nurzhan",
        "email": "nurzhan@example.com",
        "password": "strongpass",
    }
    client.post("/auth/login", json=credentials, headers=ORIGIN)
    row = db_session.scalar(select(UserSession))
    assert row is not None
    row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()
    assert client.get("/auth/me").status_code == 401


def test_browser_login_preflight_allows_session_header(client: TestClient) -> None:
    response = client.options(
        "/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-session-client",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-credentials"] == "true"


def test_change_password_requires_current_password(
    client: TestClient,
    db_session: Session,
) -> None:
    sign_in(client)

    response = client.patch(
        "/auth/me/password",
        headers=ORIGIN,
        json={
            "current_password": "wrongpass",
            "new_password": "newstrongpass",
        },
    )

    assert response.status_code == 400
    same_password_response = client.patch(
        "/auth/me/password",
        headers=ORIGIN,
        json={
            "current_password": "strongpass",
            "new_password": "strongpass",
        },
    )
    assert same_password_response.status_code == 400
    client.cookies.clear()
    assert client.post(
        "/auth/login",
        headers=ORIGIN,
        json={
            "nickname": "nurzhan",
            "email": "nurzhan@example.com",
            "password": "strongpass",
        },
    ).status_code == 200


def test_change_password_keeps_current_and_revokes_other_sessions(
    client: TestClient,
    db_session: Session,
) -> None:
    sign_in(client)
    credentials = {
        "nickname": "nurzhan",
        "email": "nurzhan@example.com",
        "password": "strongpass",
    }

    with TestClient(app) as other_client:
        assert other_client.post(
            "/auth/login",
            headers=ORIGIN,
            json=credentials,
        ).status_code == 200
        assert len(db_session.scalars(select(UserSession)).all()) == 2

        response = client.patch(
            "/auth/me/password",
            headers=ORIGIN,
            json={
                "current_password": "strongpass",
                "new_password": "newstrongpass",
            },
        )

        assert response.status_code == 204
        assert client.get("/auth/me").status_code == 200
        assert other_client.get("/auth/me").status_code == 401
        assert len(db_session.scalars(select(UserSession)).all()) == 1

    client.cookies.clear()
    assert client.post(
        "/auth/login",
        headers=ORIGIN,
        json=credentials,
    ).status_code == 401
    assert client.post(
        "/auth/login",
        headers=ORIGIN,
        json={"nickname": "nurzhan", "password": "newstrongpass"},
    ).status_code == 200
