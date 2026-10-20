import pytest

from app.core.config import (
    get_cors_origins,
    get_jwt_secret_key,
    get_required_environment_variable,
)


def test_required_environment_variable_rejects_missing_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("REQUIRED_TEST_VALUE", raising=False)

    with pytest.raises(
        RuntimeError,
        match="Environment variable REQUIRED_TEST_VALUE is required",
    ):
        get_required_environment_variable("REQUIRED_TEST_VALUE")


def test_jwt_secret_key_rejects_short_secret(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("JWT_SECRET_KEY", "too-short")

    with pytest.raises(
        RuntimeError,
        match="JWT_SECRET_KEY must contain at least 32 characters",
    ):
        get_jwt_secret_key()


def test_cors_origins_are_parsed_from_comma_separated_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(
        "CORS_ORIGINS",
        "http://localhost:5173, https://workout.example.com ",
    )

    assert get_cors_origins() == [
        "http://localhost:5173",
        "https://workout.example.com",
    ]
