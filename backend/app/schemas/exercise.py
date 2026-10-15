from pydantic import BaseModel, ConfigDict


class ExerciseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    is_bodyweight: bool