import type { Workout } from "../api/workouts";
export const categories: Record<string, string> = {
  chest: "Грудь",
  back: "Спина",
  arms: "Руки",
  legs: "Ноги",
  shoulders: "Плечи",
  core: "Кор",
};
export function formatDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
}
export function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
export function formatDuration(workout: Workout) {
  if (!workout.finished_at) return "В процессе";
  const minutes = Math.max(
    0,
    Math.floor(
      (Date.parse(workout.finished_at) - Date.parse(workout.started_at)) /
        60000,
    ),
  );
  if (!minutes) return "< 1 мин";
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`
    : `${minutes} мин`;
}
export function formatElapsed(start: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(start)) / 1000));
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
