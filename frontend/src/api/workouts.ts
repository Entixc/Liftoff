import { API_URL } from "./config";
import { apiFetch as fetch } from "./http";

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

export type WorkoutSet = {
  id: number;
  workout_exercise_id: number;
  weight_kg: string | null;
  repetitions: number;
  is_completed: boolean;
  position: number;
};

export type CreateWorkoutSetPayload = {
  weight_kg: number | null;
  repetitions: number;
};

export type UpdateWorkoutSetPayload = {
  weight_kg?: number | null;
  repetitions?: number;
  is_completed?: boolean;
};

export type UpdateWorkoutTimePayload = {
  started_at: string;
  duration_minutes: number;
};

export type ProgressSet = {
  workout_id: number;
  started_at: string;
  exercise_id: number;
  weight_kg: string | null;
  repetitions: number;
};

export async function getWorkoutProgress(): Promise<ProgressSet[]> {
  const response = await fetch(`${API_URL}/workouts/progress`);
  if (!response.ok) throw new Error("Не удалось загрузить прогресс");
  return response.json() as Promise<ProgressSet[]>;
}

export async function getActiveWorkout(): Promise<Workout | null> {
  const response = await fetch(`${API_URL}/workouts/active`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Не удалось загрузить текущую тренировку");
  }

  return response.json() as Promise<Workout>;
}

export async function startWorkout(): Promise<Workout> {
  const response = await fetch(`${API_URL}/workouts`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Не удалось начать тренировку");
  }

  return response.json() as Promise<Workout>;
}

export async function cancelWorkout(
  workoutId: number,
): Promise<void> {
  const response = await fetch(`${API_URL}/workouts/${workoutId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Не удалось отменить тренировку");
}

export async function completeWorkout(
  workoutId: number,
): Promise<Workout> {
  const response = await fetch(`${API_URL}/workouts/${workoutId}/complete`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Не удалось завершить тренировку");
  }

  return response.json() as Promise<Workout>;
}

export async function updateWorkoutTime(
  workoutId: number,
  payload: UpdateWorkoutTimePayload,
): Promise<Workout> {
  const response = await fetch(`${API_URL}/workouts/${workoutId}/time`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Не удалось изменить время тренировки");
  }

  return response.json() as Promise<Workout>;
}

export async function getWorkoutHistory(): Promise<Workout[]> {
  const response = await fetch(`${API_URL}/workouts/history`);

  if (!response.ok) {
    throw new Error("Не удалось загрузить историю тренировок");
  }

  return response.json() as Promise<Workout[]>;
}

export async function getWorkoutExercises(
  workoutId: number,
): Promise<WorkoutExercise[]> {
  const response = await fetch(`${API_URL}/workouts/${workoutId}/exercises`);

  if (!response.ok) {
    throw new Error("Не удалось загрузить упражнения тренировки");
  }

  return response.json() as Promise<WorkoutExercise[]>;
}

export async function addExerciseToWorkout(
  workoutId: number,
  exerciseId: number,
): Promise<WorkoutExercise> {
  const response = await fetch(`${API_URL}/workouts/${workoutId}/exercises`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ exercise_id: exerciseId }),
  });

  if (!response.ok) {
    throw new Error("Не удалось добавить упражнение");
  }

  return response.json() as Promise<WorkoutExercise>;
}

export async function deleteExerciseFromWorkout(
  workoutId: number,
  workoutExerciseId: number,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/workouts/${workoutId}/exercises/${workoutExerciseId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error("Не удалось удалить упражнение");
  }
}

function setsUrl(workoutId: number, workoutExerciseId: number): string {
  return `${API_URL}/workouts/${workoutId}/exercises/${workoutExerciseId}/sets`;
}

export async function getWorkoutSets(
  workoutId: number,
  workoutExerciseId: number,
): Promise<WorkoutSet[]> {
  const response = await fetch(setsUrl(workoutId, workoutExerciseId));

  if (!response.ok) {
    throw new Error("Не удалось загрузить подходы");
  }

  return response.json() as Promise<WorkoutSet[]>;
}

export async function createWorkoutSet(
  workoutId: number,
  workoutExerciseId: number,
  payload: CreateWorkoutSetPayload,
): Promise<WorkoutSet> {
  const response = await fetch(setsUrl(workoutId, workoutExerciseId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Не удалось добавить подход");
  }

  return response.json() as Promise<WorkoutSet>;
}

export async function updateWorkoutSet(
  workoutId: number,
  workoutExerciseId: number,
  setId: number,
  payload: UpdateWorkoutSetPayload,
): Promise<WorkoutSet> {
  const response = await fetch(
    `${setsUrl(workoutId, workoutExerciseId)}/${setId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error("Не удалось обновить подход");
  }

  return response.json() as Promise<WorkoutSet>;
}

export async function deleteWorkoutSet(
  workoutId: number,
  workoutExerciseId: number,
  setId: number,
): Promise<void> {
  const response = await fetch(
    `${setsUrl(workoutId, workoutExerciseId)}/${setId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error("Не удалось удалить подход");
  }
}
