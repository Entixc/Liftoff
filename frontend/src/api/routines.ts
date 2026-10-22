import { API_URL } from "./config";
import { apiFetch as fetch, ApiError } from "./http";
import type { Workout } from "./workouts";

export type Routine = {
  id: number;
  name: string;
  exercise_ids: number[];
  planned_sets: RoutinePlannedSet[];
  created_at: string;
};

export type RoutinePlannedSet = {
  exercise_id: number;
  weight_kg: string | null;
  repetitions: number;
  position: number;
};

export type RoutinePayload = Pick<Routine, "name" | "exercise_ids"> & {
  planned_sets?: Array<{
    exercise_id: number;
    weight_kg: number | null;
    repetitions: number;
  }>;
};

export async function getRoutines(): Promise<Routine[]> {
  const response = await fetch(`${API_URL}/routines`);
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<Routine[]>;
}

export async function saveRoutine(
  payload: RoutinePayload,
  id?: number,
): Promise<Routine> {
  const response = await fetch(`${API_URL}/routines${id ? `/${id}` : ""}`, {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<Routine>;
}

export async function deleteRoutine(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/routines/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new ApiError(response.status);
}

export async function startRoutine(id: number): Promise<Workout> {
  const response = await fetch(`${API_URL}/routines/${id}/start`, {
    method: "POST",
  });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<Workout>;
}
