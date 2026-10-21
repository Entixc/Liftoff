from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.exercise import Exercise
from app.models.user import User
from app.models.workout import Workout
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_set import WorkoutSet
from app.schemas.exercise import ExerciseResponse
from app.schemas.workout import WorkoutSetResponse


router = APIRouter(
    prefix="/exercises",
    tags=["exercises"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[ExerciseResponse])
def list_exercises(db: DatabaseSession) -> list[Exercise]:
    return list(
        db.scalars(
            select(Exercise).order_by(Exercise.category, Exercise.name)
        ).all()
    )


@router.get("/{exercise_id}/last-set", response_model=WorkoutSetResponse)
def get_last_set(
    exercise_id: int, current_user: CurrentUser, db: DatabaseSession
) -> WorkoutSet:
    if db.get(Exercise, exercise_id) is None:
        raise HTTPException(status_code=404, detail="Exercise not found")
    workout_set = db.scalar(
        select(WorkoutSet)
        .join(WorkoutExercise, WorkoutSet.workout_exercise_id == WorkoutExercise.id)
        .join(Workout, WorkoutExercise.workout_id == Workout.id)
        .where(
            Workout.user_id == current_user.id,
            WorkoutExercise.exercise_id == exercise_id,
        )
        .order_by(WorkoutSet.id.desc())
        .limit(1)
    )
    if workout_set is None:
        raise HTTPException(status_code=404, detail="No previous set")
    return workout_set
