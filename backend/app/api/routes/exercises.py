from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.exercise import Exercise
from app.models.muscle import Muscle
from app.models.exercise_muscle import ExerciseMuscle
from app.models.user import User
from app.models.workout import Workout
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_set import WorkoutSet
from app.schemas.exercise import (
    ExerciseResponse, ExerciseDetailResponse, MuscleResponse,
    ExerciseHistoryResponse, ExerciseHistoryWorkout, ExerciseHistorySet,
)
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


@router.get("/{exercise_id}", response_model=ExerciseDetailResponse)
def get_exercise_detail(exercise_id: int, db: DatabaseSession) -> ExerciseDetailResponse:
    exercise = db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")
    muscles = db.execute(
        select(Muscle.slug, Muscle.name_en, ExerciseMuscle.role)
        .join(ExerciseMuscle, ExerciseMuscle.muscle_id == Muscle.id)
        .where(ExerciseMuscle.exercise_id == exercise_id)
        .order_by(ExerciseMuscle.role, Muscle.name_en)
    ).all()
    return ExerciseDetailResponse(
        id=exercise.id, name=exercise.name, category=exercise.category,
        is_bodyweight=exercise.is_bodyweight, description_en=exercise.description_en,
        muscles=[MuscleResponse(slug=row[0], name_en=row[1], role=row[2]) for row in muscles],
    )


@router.get("/{exercise_id}/history", response_model=ExerciseHistoryResponse)
def get_exercise_history(
    exercise_id: int, current_user: CurrentUser, db: DatabaseSession,
) -> ExerciseHistoryResponse:
    if db.get(Exercise, exercise_id) is None:
        raise HTTPException(status_code=404, detail="Exercise not found")
    rows = db.execute(
        select(WorkoutExercise.id, Workout.id, Workout.started_at, Workout.finished_at, Workout.status)
        .join(Workout, WorkoutExercise.workout_id == Workout.id)
        .where(WorkoutExercise.exercise_id == exercise_id, Workout.user_id == current_user.id)
        .order_by(Workout.started_at.desc(), Workout.id.desc())
    ).all()
    item_ids = [row[0] for row in rows]
    sets_by_item: dict[int, list[ExerciseHistorySet]] = {item_id: [] for item_id in item_ids}
    if item_ids:
        for workout_set in db.scalars(
            select(WorkoutSet)
            .where(WorkoutSet.workout_exercise_id.in_(item_ids))
            .order_by(WorkoutSet.position)
        ).all():
            sets_by_item[workout_set.workout_exercise_id].append(
                ExerciseHistorySet(
                    id=workout_set.id, weight_kg=workout_set.weight_kg,
                    repetitions=workout_set.repetitions,
                    is_completed=workout_set.is_completed, position=workout_set.position,
                )
            )
    active = None
    completed = []
    for item_id, workout_id, started_at, finished_at, workout_status in rows:
        entry = ExerciseHistoryWorkout(
            workout_id=workout_id, started_at=started_at,
            finished_at=finished_at, sets=sets_by_item[item_id],
        )
        if workout_status == "active":
            active = entry
        elif workout_status == "completed":
            completed.append(entry)
    return ExerciseHistoryResponse(active=active, completed=completed)


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
