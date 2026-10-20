from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.workout import Workout
from app.models.exercise import Exercise
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_set import WorkoutSet
from app.schemas.workout import (
    AddWorkoutExerciseRequest,
    WorkoutExerciseResponse,
    WorkoutResponse,
)

router = APIRouter(
    prefix="/workouts",
    tags=["workouts"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post(
    "",
    response_model=WorkoutResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_workout(
    current_user: CurrentUser,
    db: DatabaseSession,
) -> Workout:
    active_workout = db.scalar(
        select(Workout).where(
            Workout.user_id == current_user.id,
            Workout.status == "active",
        )
    )
    if active_workout is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active workout",
        )

    workout = Workout(user_id=current_user.id)
    db.add(workout)
    db.commit()
    db.refresh(workout)

    return workout


@router.get("/active", response_model=WorkoutResponse)
def get_active_workout(
    current_user: CurrentUser,
    db: DatabaseSession,
) -> Workout:
    workout = db.scalar(
        select(Workout).where(
            Workout.user_id == current_user.id,
            Workout.status == "active",
        )
    )
    if workout is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active workout",
        )

    return workout


@router.get("/history", response_model=list[WorkoutResponse])
def list_workout_history(
    current_user: CurrentUser,
    db: DatabaseSession,
) -> list[Workout]:
    return list(
        db.scalars(
            select(Workout)
            .where(
                Workout.user_id == current_user.id,
                Workout.status == "completed",
            )
            .order_by(Workout.finished_at.desc(), Workout.id.desc())
        ).all()
    )


@router.post(
    "/{workout_id}/complete",
    response_model=WorkoutResponse,
)
def complete_workout(
    workout_id: int,
    current_user: CurrentUser,
    db: DatabaseSession,
) -> Workout:
    workout = db.scalar(
        select(Workout).where(
            Workout.id == workout_id,
            Workout.user_id == current_user.id,
        )
    )
    if workout is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found",
        )
    if workout.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Workout is already completed",
        )

    workout.status = "completed"
    workout.finished_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(workout)
    return workout


@router.post(
    "/{workout_id}/exercises",
    response_model=WorkoutExerciseResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_exercise_to_workout(
    workout_id: int,
    request: AddWorkoutExerciseRequest,
    current_user: CurrentUser,
    db: DatabaseSession,
) -> WorkoutExercise:
    workout = db.scalar(
        select(Workout).where(
            Workout.id == workout_id,
            Workout.user_id == current_user.id,
            Workout.status == "active",
        )
    )
    if workout is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found",
        )

    exercise = db.get(Exercise, request.exercise_id)
    if exercise is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )

    existing_workout_exercise = db.scalar(
        select(WorkoutExercise).where(
            WorkoutExercise.workout_id == workout.id,
            WorkoutExercise.exercise_id == exercise.id,
        )
    )
    if existing_workout_exercise is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Exercise is already in this workout",
        )

    last_position = db.scalar(
        select(func.max(WorkoutExercise.position)).where(
            WorkoutExercise.workout_id == workout.id,
        )
    )
    next_position = (last_position or 0) + 1

    workout_exercise = WorkoutExercise(
        workout_id=workout.id,
        exercise_id=exercise.id,
        position=next_position,
    )
    db.add(workout_exercise)
    db.commit()
    db.refresh(workout_exercise)

    return workout_exercise


@router.get(
    "/{workout_id}/exercises",
    response_model=list[WorkoutExerciseResponse],
)
def list_workout_exercises(
    workout_id: int,
    current_user: CurrentUser,
    db: DatabaseSession,
) -> list[WorkoutExercise]:
    workout = db.scalar(
        select(Workout).where(
            Workout.id == workout_id,
            Workout.user_id == current_user.id,
        )
    )
    if workout is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found",
        )

    return list(
        db.scalars(
            select(WorkoutExercise)
            .where(WorkoutExercise.workout_id == workout.id)
            .order_by(WorkoutExercise.position)
        ).all()
    )


@router.delete(
    "/{workout_id}/exercises/{workout_exercise_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_workout_exercise(
    workout_id: int,
    workout_exercise_id: int,
    current_user: CurrentUser,
    db: DatabaseSession,
) -> Response:
    workout_exercise = db.scalar(
        select(WorkoutExercise)
        .join(Workout, WorkoutExercise.workout_id == Workout.id)
        .where(
            WorkoutExercise.id == workout_exercise_id,
            WorkoutExercise.workout_id == workout_id,
            Workout.user_id == current_user.id,
            Workout.status == "active",
        )
    )
    if workout_exercise is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout exercise not found",
        )

    db.execute(
        delete(WorkoutSet).where(
            WorkoutSet.workout_exercise_id == workout_exercise.id,
        )
    )
    db.delete(workout_exercise)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
