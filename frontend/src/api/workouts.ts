const API_URL = "http://localhost:8000";

export type Workout = {
  id: number;
  user_id: number;
  started_at: string;
  finished_at: string | null;
  status: "active" | "completed";
};

export type WorkoutExercise = {
  id: number;
  workout_id: number;
  exercise_id: number;
  position: number;
};

export async function getActiveWorkout(token: string): Promise<Workout | null> {
  const response = await fetch(`${API_URL}/workouts/active`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Не удалось загрузить текущую тренировку");
  }

  return response.json() as Promise<Workout>;
}

export async function startWorkout(token: string): Promise<Workout> {
  const response = await fetch(`${API_URL}/workouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Не удалось начать тренировку");
  }

  return response.json() as Promise<Workout>;
}

export async function getWorkoutExercises(
  token: string,
  workoutId: number,
): Promise<WorkoutExercise[]> {
  const response = await fetch(`${API_URL}/workouts/${workoutId}/exercises`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить упражнения тренировки");
  }

  return response.json() as Promise<WorkoutExercise[]>;
}

export async function addExerciseToWorkout(
  token: string,
  workoutId: number,
  exerciseId: number,
): Promise<WorkoutExercise> {
  const response = await fetch(`${API_URL}/workouts/${workoutId}/exercises`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ exercise_id: exerciseId }),
  });

  if (!response.ok) {
    throw new Error("Не удалось добавить упражнение");
  }

  return response.json() as Promise<WorkoutExercise>;
}
