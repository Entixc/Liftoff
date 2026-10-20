from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.exercise import Exercise
from app.models.user import User
from app.models.workout import Workout
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_set import WorkoutSet
from app.schemas.workout import (
    CreateWorkoutSetRequest,
    UpdateWorkoutSetRequest,
    WorkoutSetResponse,
)


router = APIRouter(
    prefix="/workouts",
    tags=["workout sets"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def get_owned_workout_exercise(
    db: Session,
    current_user: User,
    workout_id: int,
    workout_exercise_id: int,
) -> tuple[WorkoutExercise, Exercise]:
    statement = (
        select(WorkoutExercise, Exercise)
        .join(Workout, WorkoutExercise.workout_id == Workout.id)
        .join(Exercise, WorkoutExercise.exercise_id == Exercise.id)
        .where(
            WorkoutExercise.id == workout_exercise_id,
            WorkoutExercise.workout_id == workout_id,
            Workout.user_id == current_user.id,
        )
    )
    result = db.execute(statement).one_or_none()
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout exercise not found",
        )

    workout_exercise, exercise = result
    return workout_exercise, exercise


def validate_weight(exercise: Exercise, weight_kg: object) -> None:
    if not exercise.is_bodyweight and weight_kg is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Weight is required for this exercise",
        )


@router.get(
    "/{workout_id}/exercises/{workout_exercise_id}/sets",
    response_model=list[WorkoutSetResponse],
)
def list_workout_sets(
    workout_id: int,
    workout_exercise_id: int,
    current_user: CurrentUser,
    db: DatabaseSession,
) -> list[WorkoutSet]:
    workout_exercise, _ = get_owned_workout_exercise(
        db,
        current_user,
        workout_id,
        workout_exercise_id,
    )

    return list(
        db.scalars(
            select(WorkoutSet)
            .where(WorkoutSet.workout_exercise_id == workout_exercise.id)
            .order_by(WorkoutSet.position)
        ).all()
    )


@router.post(
    "/{workout_id}/exercises/{workout_exercise_id}/sets",
    response_model=WorkoutSetResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_workout_set(
    workout_id: int,
    workout_exercise_id: int,
    request: CreateWorkoutSetRequest,
    current_user: CurrentUser,
    db: DatabaseSession,
) -> WorkoutSet:
    workout_exercise, exercise = get_owned_workout_exercise(
        db,
        current_user,
        workout_id,
        workout_exercise_id,
    )
    validate_weight(exercise, request.weight_kg)

    last_position = db.scalar(
        select(func.max(WorkoutSet.position)).where(
            WorkoutSet.workout_exercise_id == workout_exercise.id,
        )
    )
    workout_set = WorkoutSet(
        workout_exercise_id=workout_exercise.id,
        weight_kg=request.weight_kg,
        repetitions=request.repetitions,
        position=(last_position or 0) + 1,
    )
    db.add(workout_set)
    db.commit()
    db.refresh(workout_set)
    return workout_set


@router.patch(
    "/{workout_id}/exercises/{workout_exercise_id}/sets/{set_id}",
    response_model=WorkoutSetResponse,
)
def update_workout_set(
    workout_id: int,
    workout_exercise_id: int,
    set_id: int,
    request: UpdateWorkoutSetRequest,
    current_user: CurrentUser,
    db: DatabaseSession,
) -> WorkoutSet:
    workout_exercise, exercise = get_owned_workout_exercise(
        db,
        current_user,
        workout_id,
        workout_exercise_id,
    )
    if not request.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="At least one set field must be provided",
        )
    if "repetitions" in request.model_fields_set and request.repetitions is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Repetitions cannot be null",
        )
    if "is_completed" in request.model_fields_set and request.is_completed is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Completion status cannot be null",
        )
    if "weight_kg" in request.model_fields_set:
        validate_weight(exercise, request.weight_kg)

    workout_set = db.scalar(
        select(WorkoutSet).where(
            WorkoutSet.id == set_id,
            WorkoutSet.workout_exercise_id == workout_exercise.id,
        )
    )
    if workout_set is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Set not found",
        )

    for field_name in request.model_fields_set:
        setattr(workout_set, field_name, getattr(request, field_name))

    db.commit()
    db.refresh(workout_set)
    return workout_set


@router.delete(
    "/{workout_id}/exercises/{workout_exercise_id}/sets/{set_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_workout_set(
    workout_id: int,
    workout_exercise_id: int,
    set_id: int,
    current_user: CurrentUser,
    db: DatabaseSession,
) -> Response:
    workout_exercise, _ = get_owned_workout_exercise(
        db,
        current_user,
        workout_id,
        workout_exercise_id,
    )
    workout_set = db.scalar(
        select(WorkoutSet).where(
            WorkoutSet.id == set_id,
            WorkoutSet.workout_exercise_id == workout_exercise.id,
        )
    )
    if workout_set is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Set not found",
        )

    db.delete(workout_set)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
