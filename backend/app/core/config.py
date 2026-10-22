import os


def get_required_environment_variable(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Environment variable {name} is required")
    return value


def get_database_url() -> str:
    return get_required_environment_variable("DATABASE_URL")


def get_jwt_secret_key() -> str:
    secret_key = get_required_environment_variable("JWT_SECRET_KEY")
    if len(secret_key) < 32:
        raise RuntimeError("JWT_SECRET_KEY must contain at least 32 characters")
    return secret_key


def get_cors_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    origins = [
        origin.strip()
        for origin in raw_origins.split(",")
        if origin.strip()
    ]
    if not origins:
        raise RuntimeError("CORS_ORIGINS must contain at least one origin")
    return origins


def get_session_cookie_secure() -> bool:
    value = os.getenv("SESSION_COOKIE_SECURE", "false").strip().lower()
    if value not in {"true", "false"}:
        raise RuntimeError("SESSION_COOKIE_SECURE must be true or false")
    return value == "true"
