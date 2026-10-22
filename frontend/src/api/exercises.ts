import { API_URL } from "./config";
import { apiFetch as fetch } from "./http";
import type { WorkoutSet } from "./workouts";

export type Exercise = {
  id: number;
  name: string;
  category: string;
  is_bodyweight: boolean;
};

export type ExerciseMuscle = {
  slug: string;
  name_en: string;
  role: "primary" | "secondary";
};
export type ExerciseDetail = Exercise & {
  description_en: string;
  muscles: ExerciseMuscle[];
};
export type ExerciseHistorySet = {
  id: number;
  weight_kg: string | null;
  repetitions: number;
  is_completed: boolean;
  position: number;
};
export type ExerciseHistoryWorkout = {
  workout_id: number;
  started_at: string;
  finished_at: string | null;
  sets: ExerciseHistorySet[];
};
export type ExerciseHistory = {
  active: ExerciseHistoryWorkout | null;
  completed: ExerciseHistoryWorkout[];
};

export async function getExerciseDetail(
  exerciseId: number,
): Promise<ExerciseDetail> {
  const response = await fetch(`${API_URL}/exercises/${exerciseId}`);
  if (!response.ok) throw new Error("Не удалось загрузить упражнение");
  return response.json() as Promise<ExerciseDetail>;
}

export async function getExerciseHistory(
  exerciseId: number,
): Promise<ExerciseHistory> {
  const response = await fetch(`${API_URL}/exercises/${exerciseId}/history`);
  if (!response.ok) throw new Error("Не удалось загрузить историю упражнения");
  return response.json() as Promise<ExerciseHistory>;
}

export async function getExercises(): Promise<Exercise[]> {
  const response = await fetch(`${API_URL}/exercises`);

  if (!response.ok) {
    throw new Error("Не удалось загрузить каталог упражнений");
  }

  return response.json() as Promise<Exercise[]>;
}

export async function getLastSet(
  exerciseId: number,
): Promise<WorkoutSet | null> {
  const response = await fetch(`${API_URL}/exercises/${exerciseId}/last-set`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Не удалось загрузить последний подход");
  return response.json() as Promise<WorkoutSet>;
}
