import { useEffect, useState } from "react";

import type { Exercise } from "../api/exercises";
import { getWorkoutHistory, type Workout } from "../api/workouts";
import { WorkoutHistoryDetails } from "./WorkoutHistoryDetails";

type WorkoutHistoryProps = {
  exercises: Exercise[];
  refreshVersion: number;
  token: string;
};

function formatDuration(workout: Workout): string {
  if (workout.finished_at === null) {
    return "—";
  }

  const milliseconds =
    new Date(workout.finished_at).getTime() -
    new Date(workout.started_at).getTime();
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0 && minutes === 0) {
    return "меньше минуты";
  }
  if (hours === 0) {
    return `${minutes} мин`;
  }
  return `${hours} ч ${minutes} мин`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WorkoutHistory({
  exercises,
  refreshVersion,
  token,
}: WorkoutHistoryProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadHistory() {
      setIsLoading(true);
      setError(null);
      try {
        const loadedWorkouts = await getWorkoutHistory(token);
        if (!isCancelled) {
          setWorkouts(loadedWorkouts);
        }
      } catch {
        if (!isCancelled) {
          setError("Не удалось загрузить историю тренировок.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();
    return () => {
      isCancelled = true;
    };
  }, [refreshVersion, token]);

  return (
    <section className="history-section">
      <h2>История тренировок</h2>
      {isLoading ? (
        <p>Загружаем историю...</p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : workouts.length === 0 ? (
        <p className="muted-text">Завершённых тренировок пока нет.</p>
      ) : (
        <ul className="history-list">
          {workouts.map((workout) => (
            <li key={workout.id}>
              <div>
                <strong>{formatDate(workout.started_at)}</strong>
                <span>Тренировка #{workout.id}</span>
              </div>
              <div className="history-actions">
                <span>{formatDuration(workout)}</span>
                <button
                  type="button"
                  onClick={() => setSelectedWorkout(workout)}
                >
                  Открыть
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selectedWorkout && (
        <WorkoutHistoryDetails
          workout={selectedWorkout}
          exercises={exercises}
          token={token}
          onClose={() => setSelectedWorkout(null)}
        />
      )}
    </section>
  );
}
