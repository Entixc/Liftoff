from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.api.routes.sets import validate_weight
from app.db.session import get_db
from app.models.exercise import Exercise
from app.models.routine import Routine
from app.models.routine_exercise import RoutineExercise
from app.models.routine_set import RoutineSet
from app.models.user import User
from app.models.workout import Workout
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_set import WorkoutSet
from app.schemas.routine import PlannedSetResponse, RoutineRequest, RoutineResponse
from app.schemas.workout import WorkoutResponse

router = APIRouter(prefix="/routines", tags=["routines"])
DatabaseSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def owned_routine(db: Session, user_id: int, routine_id: int) -> Routine:
    routine = db.scalar(
        select(Routine).where(Routine.id == routine_id, Routine.user_id == user_id)
    )
    if routine is None:
        raise HTTPException(status_code=404, detail="Routine not found")
    return routine


def validate_exercises(db: Session, request: RoutineRequest) -> None:
    found = {
        exercise.id: exercise
        for exercise in db.scalars(
            select(Exercise).where(Exercise.id.in_(request.exercise_ids))
        )
    }
    if set(found) != set(request.exercise_ids):
        raise HTTPException(status_code=422, detail="Unknown exercise in routine")
    for planned_set in request.planned_sets:
        validate_weight(found[planned_set.exercise_id], planned_set.weight_kg)


def routine_response(db: Session, routine: Routine) -> RoutineResponse:
    routine_exercises = list(
        db.scalars(
            select(RoutineExercise)
            .where(RoutineExercise.routine_id == routine.id)
            .order_by(RoutineExercise.position)
        )
    )
    planned_sets = [
        PlannedSetResponse(
            exercise_id=exercise_id,
            weight_kg=routine_set.weight_kg,
            repetitions=routine_set.repetitions,
            position=routine_set.position,
        )
        for routine_set, exercise_id in db.execute(
            select(RoutineSet, RoutineExercise.exercise_id)
            .join(RoutineExercise, RoutineSet.routine_exercise_id == RoutineExercise.id)
            .where(RoutineExercise.routine_id == routine.id)
            .order_by(RoutineExercise.position, RoutineSet.position)
        )
    ]
    return RoutineResponse(
        id=routine.id,
        name=routine.name,
        exercise_ids=[item.exercise_id for item in routine_exercises],
        planned_sets=planned_sets,
        created_at=routine.created_at,
    )


def add_routine_content(db: Session, routine: Routine, request: RoutineRequest) -> None:
    routine_exercises = [
        RoutineExercise(routine_id=routine.id, exercise_id=exercise_id, position=position)
        for position, exercise_id in enumerate(request.exercise_ids, start=1)
    ]
    db.add_all(routine_exercises)
    db.flush()
    by_exercise = {item.exercise_id: item.id for item in routine_exercises}
    positions: dict[int, int] = {}
    for planned_set in request.planned_sets:
        exercise_id = planned_set.exercise_id
        positions[exercise_id] = positions.get(exercise_id, 0) + 1
        db.add(
            RoutineSet(
                routine_exercise_id=by_exercise[exercise_id],
                weight_kg=planned_set.weight_kg,
                repetitions=planned_set.repetitions,
                position=positions[exercise_id],
            )
        )


@router.get("", response_model=list[RoutineResponse])
def list_routines(current_user: CurrentUser, db: DatabaseSession) -> list[RoutineResponse]:
    routines = db.scalars(
        select(Routine)
        .where(Routine.user_id == current_user.id)
        .order_by(Routine.id.desc())
    )
    return [routine_response(db, routine) for routine in routines]


@router.post("", response_model=RoutineResponse, status_code=status.HTTP_201_CREATED)
def create_routine(
    request: RoutineRequest, current_user: CurrentUser, db: DatabaseSession
) -> RoutineResponse:
    validate_exercises(db, request)
    routine = Routine(user_id=current_user.id, name=request.name)
    db.add(routine)
    db.flush()
    add_routine_content(db, routine, request)
    db.commit()
    db.refresh(routine)
    return routine_response(db, routine)


@router.put("/{routine_id}", response_model=RoutineResponse)
def update_routine(
    routine_id: int, request: RoutineRequest, current_user: CurrentUser, db: DatabaseSession
) -> RoutineResponse:
    routine = owned_routine(db, current_user.id, routine_id)
    validate_exercises(db, request)
    routine.name = request.name
    db.execute(
        delete(RoutineSet).where(
            RoutineSet.routine_exercise_id.in_(
                select(RoutineExercise.id).where(RoutineExercise.routine_id == routine.id)
            )
        )
    )
    db.execute(delete(RoutineExercise).where(RoutineExercise.routine_id == routine.id))
    add_routine_content(db, routine, request)
    db.commit()
    return routine_response(db, routine)


@router.delete("/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_routine(
    routine_id: int, current_user: CurrentUser, db: DatabaseSession
) -> Response:
    routine = owned_routine(db, current_user.id, routine_id)
    db.execute(
        delete(RoutineSet).where(
            RoutineSet.routine_exercise_id.in_(
                select(RoutineExercise.id).where(RoutineExercise.routine_id == routine.id)
            )
        )
    )
    db.execute(delete(RoutineExercise).where(RoutineExercise.routine_id == routine.id))
    db.delete(routine)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{routine_id}/start", response_model=WorkoutResponse, status_code=status.HTTP_201_CREATED
)
def start_routine(
    routine_id: int, current_user: CurrentUser, db: DatabaseSession
) -> Workout:
    routine = owned_routine(db, current_user.id, routine_id)
    active = db.scalar(
        select(Workout).where(
            Workout.user_id == current_user.id, Workout.status == "active"
        )
    )
    if active is not None:
        raise HTTPException(status_code=409, detail="You already have an active workout")

    plan = routine_response(db, routine)
    workout = Workout(user_id=current_user.id)
    db.add(workout)
    db.flush()
    workout_exercises = [
        WorkoutExercise(workout_id=workout.id, exercise_id=exercise_id, position=position)
        for position, exercise_id in enumerate(plan.exercise_ids, start=1)
    ]
    db.add_all(workout_exercises)
    db.flush()
    by_exercise = {item.exercise_id: item.id for item in workout_exercises}
    db.add_all(
        WorkoutSet(
            workout_exercise_id=by_exercise[planned_set.exercise_id],
            weight_kg=planned_set.weight_kg,
            repetitions=planned_set.repetitions,
            position=planned_set.position,
            is_completed=False,
        )
        for planned_set in plan.planned_sets
    )
    db.commit()
    db.refresh(workout)
    return workout
