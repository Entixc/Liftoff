from pydantic import BaseModel, ConfigDict
from datetime import datetime
from decimal import Decimal
from typing import Literal


class ExerciseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    is_bodyweight: bool


class MuscleResponse(BaseModel):
    slug: str
    name_en: str
    role: Literal["primary", "secondary"]


class ExerciseDetailResponse(ExerciseResponse):
    description_en: str
    muscles: list[MuscleResponse]


class ExerciseHistorySet(BaseModel):
    id: int
    weight_kg: Decimal | None
    repetitions: int
    is_completed: bool
    position: int


class ExerciseHistoryWorkout(BaseModel):
    workout_id: int
    started_at: datetime
    finished_at: datetime | None
    sets: list[ExerciseHistorySet]


class ExerciseHistoryResponse(BaseModel):
    active: ExerciseHistoryWorkout | None
    completed: list[ExerciseHistoryWorkout]
