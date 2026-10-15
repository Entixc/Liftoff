from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.exercise import Exercise
from app.schemas.exercise import ExerciseResponse


router = APIRouter(
    prefix="/exercises",
    tags=["exercises"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[ExerciseResponse])
def list_exercises(db: DatabaseSession) -> list[Exercise]:
    return list(
        db.scalars(
            select(Exercise).order_by(Exercise.category, Exercise.name)
        ).all()
    )
