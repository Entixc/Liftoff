from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import JWT_ALGORITHM, JWT_SECRET_KEY
from app.core.sessions import SESSION_COOKIE_NAME, get_session, require_trusted_origin
from app.db.session import get_db
from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

DatabaseSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    request: Request,
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: DatabaseSession,
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    browser_token = request.cookies.get(SESSION_COOKIE_NAME)
    if token is None and browser_token is not None:
        require_trusted_origin(request)
        browser_session = get_session(db, browser_token)
        if browser_session is None:
            raise credentials_exception
        user = db.get(User, browser_session.user_id)
        if user is None:
            raise credentials_exception
        return user

    if token is None:
        raise credentials_exception

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise credentials_exception from None

    user = db.get(User, user_id)
    if user is None:
        raise credentials_exception

    return user
