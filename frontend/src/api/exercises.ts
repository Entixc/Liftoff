import { API_URL } from "./config";
import { apiFetch as fetch } from "./http";

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
