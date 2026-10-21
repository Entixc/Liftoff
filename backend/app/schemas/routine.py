from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.workout import Weight


class PlannedSetInput(BaseModel):
    exercise_id: Annotated[int, Field(gt=0)]
    weight_kg: Weight = None
    repetitions: Annotated[int, Field(gt=0)]


class PlannedSetResponse(PlannedSetInput):
    position: int


class RoutineRequest(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=80)]
    exercise_ids: Annotated[list[Annotated[int, Field(gt=0)]], Field(min_length=1, max_length=50)]
    planned_sets: Annotated[list[PlannedSetInput], Field(max_length=1500)] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Routine name cannot be blank")
        return value

    @field_validator("exercise_ids")
    @classmethod
    def exercises_unique(cls, value: list[int]) -> list[int]:
        if len(value) != len(set(value)):
            raise ValueError("Routine exercises must be unique")
        return value

    @model_validator(mode="after")
    def planned_sets_match_exercises(self) -> "RoutineRequest":
        counts: dict[int, int] = {}
        for planned_set in self.planned_sets:
            if planned_set.exercise_id not in self.exercise_ids:
                raise ValueError("Planned set refers to an exercise outside the routine")
            counts[planned_set.exercise_id] = counts.get(planned_set.exercise_id, 0) + 1
            if counts[planned_set.exercise_id] > 30:
                raise ValueError("Too many planned sets for an exercise")
        return self


class RoutineResponse(BaseModel):
    id: int
    name: str
    exercise_ids: list[int]
    planned_sets: list[PlannedSetResponse]
    created_at: datetime
