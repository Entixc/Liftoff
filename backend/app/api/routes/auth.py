from typing import Annotated
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.models.body_weight_entry import BodyWeightEntry
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
    BodyWeightEntryResponse,
)

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: CurrentUser) -> User:
    return current_user


@router.get("/me/weight-history", response_model=list[BodyWeightEntryResponse])
def get_body_weight_history(
    current_user: CurrentUser,
    db: DatabaseSession,
) -> list[BodyWeightEntry]:
    return list(db.scalars(
        select(BodyWeightEntry)
        .where(BodyWeightEntry.user_id == current_user.id)
        .order_by(BodyWeightEntry.recorded_at, BodyWeightEntry.id)
    ).all())


@router.patch("/me", response_model=UserResponse)
def update_my_profile(
    request: UpdateProfileRequest,
    current_user: CurrentUser,
    db: DatabaseSession,
) -> User:
    if not request.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="At least one profile field must be provided",
        )

    weight_changed = (
        "body_weight_kg" in request.model_fields_set
        and request.body_weight_kg is not None
        and request.body_weight_kg != current_user.body_weight_kg
    )
    for field_name in request.model_fields_set:
        setattr(current_user, field_name, getattr(request, field_name))

    if weight_changed:
        db.add(BodyWeightEntry(
            user_id=current_user.id,
            weight_kg=request.body_weight_kg,
            recorded_at=datetime.now(timezone.utc),
        ))

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(request: RegisterRequest, db: DatabaseSession) -> User:
    existing_user = db.scalar(
        select(User).where(User.nickname == request.nickname)
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nickname is already registered",
        )

    user = User(
        nickname=request.nickname,
        password_hash=hash_password(request.password),
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nickname is already registered",
        ) from error

    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login_user(request: LoginRequest, db: DatabaseSession) -> TokenResponse:
    user = db.scalar(select(User).where(User.nickname == request.nickname))

    if user is None or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid nickname or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(access_token=create_access_token(user.id))
