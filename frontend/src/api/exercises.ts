import { API_URL } from "./config";
import { apiFetch as fetch } from "./http";
import type { WorkoutSet } from "./workouts";

export type Exercise = {
  id: number;
  name: string;
  category: string;
  is_bodyweight: boolean;
};

export async function getExercises(): Promise<Exercise[]> {
  const response = await fetch(`${API_URL}/exercises`);

  if (!response.ok) {
    throw new Error("Не удалось загрузить каталог упражнений");
  }

  return response.json() as Promise<Exercise[]>;
}

export async function getLastSet(
  token: string,
  exerciseId: number,
): Promise<WorkoutSet | null> {
  const response = await fetch(`${API_URL}/exercises/${exerciseId}/last-set`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Не удалось загрузить последний подход");
  return response.json() as Promise<WorkoutSet>;
}
