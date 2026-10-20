from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.exercises import router as exercises_router
from app.api.routes.sets import router as sets_router
from app.api.routes.workout import router as workouts_router
from app.core.config import get_cors_origins


app = FastAPI(title="Workout Tracker API", version="0.1.0")

app.include_router(auth_router)
app.include_router(exercises_router)
app.include_router(workouts_router)
app.include_router(sets_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Return a lightweight signal that the HTTP API is running."""
    return {"status": "ok"}
