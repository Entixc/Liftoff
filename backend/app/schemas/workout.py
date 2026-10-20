from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field


class WorkoutResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    started_at: datetime
    finished_at: datetime | None
    status: str


class UpdateWorkoutTimeRequest(BaseModel):
    started_at: AwareDatetime
    finished_at: AwareDatetime


class AddWorkoutExerciseRequest(BaseModel):
    exercise_id: Annotated[int, Field(gt=0)]


class WorkoutExerciseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workout_id: int
    exercise_id: int
    position: int


Weight = Annotated[
    Decimal | None,
    Field(gt=0, lt=1000, decimal_places=2),
]


class CreateWorkoutSetRequest(BaseModel):
    weight_kg: Weight = None
    repetitions: Annotated[int, Field(gt=0)]


class UpdateWorkoutSetRequest(BaseModel):
    weight_kg: Weight = None
    repetitions: Annotated[int | None, Field(gt=0)] = None
    is_completed: bool | None = None


class WorkoutSetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workout_exercise_id: int
    weight_kg: Decimal | None
    repetitions: int
    is_completed: bool
    position: int
