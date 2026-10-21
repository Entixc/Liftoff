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
  finished_at: string;
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

export async function cancelWorkout(
  token: string,
  workoutId: number,
): Promise<void> {
  const response = await fetch(`${API_URL}/workouts/${workoutId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Не удалось отменить тренировку");
}

export async function completeWorkout(
  token: string,
  workoutId: number,
): Promise<Workout> {
  const response = await fetch(`${API_URL}/workouts/${workoutId}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Не удалось завершить тренировку");
  }

  return response.json() as Promise<Workout>;
}

export async function updateWorkoutTime(
  token: string,
  workoutId: number,
  payload: UpdateWorkoutTimePayload,
): Promise<Workout> {
  const response = await fetch(`${API_URL}/workouts/${workoutId}/time`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Не удалось изменить время тренировки");
  }

  return response.json() as Promise<Workout>;
}

export async function getWorkoutHistory(token: string): Promise<Workout[]> {
  const response = await fetch(`${API_URL}/workouts/history`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить историю тренировок");
  }

  return response.json() as Promise<Workout[]>;
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

export async function deleteExerciseFromWorkout(
  token: string,
  workoutId: number,
  workoutExerciseId: number,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/workouts/${workoutId}/exercises/${workoutExerciseId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
  token: string,
  workoutId: number,
  workoutExerciseId: number,
): Promise<WorkoutSet[]> {
  const response = await fetch(setsUrl(workoutId, workoutExerciseId), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить подходы");
  }

  return response.json() as Promise<WorkoutSet[]>;
}

export async function createWorkoutSet(
  token: string,
  workoutId: number,
  workoutExerciseId: number,
  payload: CreateWorkoutSetPayload,
): Promise<WorkoutSet> {
  const response = await fetch(setsUrl(workoutId, workoutExerciseId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
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
  token: string,
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
        Authorization: `Bearer ${token}`,
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
  token: string,
  workoutId: number,
  workoutExerciseId: number,
  setId: number,
): Promise<void> {
  const response = await fetch(
    `${setsUrl(workoutId, workoutExerciseId)}/${setId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Не удалось удалить подход");
  }
}
