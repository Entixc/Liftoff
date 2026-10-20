from datetime import datetime
from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field


class WorkoutResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    started_at: datetime
    finished_at: datetime | None
    status: str

class AddWorkoutExerciseRequest(BaseModel):
    exercise_id: Annotated[int, Field(gt=0)]


class WorkoutExerciseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workout_id: int
    exercise_id: int
    position: int