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

function headers(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function getRoutines(token: string): Promise<Routine[]> {
  const response = await fetch(`${API_URL}/routines`, {
    headers: headers(token),
  });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<Routine[]>;
}

export async function saveRoutine(
  token: string,
  payload: RoutinePayload,
  id?: number,
): Promise<Routine> {
  const response = await fetch(`${API_URL}/routines${id ? `/${id}` : ""}`, {
    method: id ? "PUT" : "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<Routine>;
}

export async function deleteRoutine(token: string, id: number): Promise<void> {
  const response = await fetch(`${API_URL}/routines/${id}`, {
    method: "DELETE",
    headers: headers(token),
  });
  if (!response.ok) throw new ApiError(response.status);
}

export async function startRoutine(
  token: string,
  id: number,
): Promise<Workout> {
  const response = await fetch(`${API_URL}/routines/${id}/start`, {
    method: "POST",
    headers: headers(token),
  });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<Workout>;
}
