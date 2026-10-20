import { useEffect, useState } from "react";

import type { Exercise } from "../api/exercises";
import {
  addExerciseToWorkout,
  deleteExerciseFromWorkout,
  getWorkoutExercises,
  startWorkout,
  type Workout,
  type WorkoutExercise,
} from "../api/workouts";
import { WorkoutExerciseCard } from "./WorkoutExerciseCard";

type ActiveWorkoutProps = {
  workout: Workout | null;
  exercises: Exercise[];
  token: string;
  onWorkoutStarted: (workout: Workout) => void;
};

function formatElapsedTime(startedAt: string, currentTime: number): string {
  const elapsedMilliseconds = currentTime - new Date(startedAt).getTime();
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMilliseconds / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function ActiveWorkout({
  workout,
  exercises,
  token,
  onWorkoutStarted,
}: ActiveWorkoutProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workout === null) {
      return;
    }

    setCurrentTime(Date.now());
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [workout]);

  useEffect(() => {
    if (workout === null) {
      setWorkoutExercises([]);
      return;
    }

    const currentWorkout = workout;
    let isCancelled = false;

    async function loadWorkoutExercises() {
      setIsLoadingExercises(true);
      setError(null);

      try {
        const loadedExercises = await getWorkoutExercises(
          token,
          currentWorkout.id,
        );
        if (!isCancelled) {
          setWorkoutExercises(loadedExercises);
        }
      } catch {
        if (!isCancelled) {
          setError("Не удалось загрузить упражнения тренировки.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingExercises(false);
        }
      }
    }

    void loadWorkoutExercises();

    return () => {
      isCancelled = true;
    };
  }, [token, workout]);

  async function handleStartWorkout() {
    setIsStarting(true);
    setError(null);

    try {
      const createdWorkout = await startWorkout(token);
      onWorkoutStarted(createdWorkout);
    } catch {
      setError("Не удалось начать тренировку. Попробуй ещё раз.");
    } finally {
      setIsStarting(false);
    }
  }

  async function handleAddExercise() {
    if (workout === null || selectedExerciseId === "") {
      return;
    }

    setIsAddingExercise(true);
    setError(null);

    try {
      const addedExercise = await addExerciseToWorkout(
        token,
        workout.id,
        Number(selectedExerciseId),
      );
      setWorkoutExercises((currentExercises) =>
        [...currentExercises, addedExercise].sort(
          (first, second) => first.position - second.position,
        ),
      );
      setSelectedExerciseId("");
    } catch {
      setError("Не удалось добавить упражнение. Попробуй ещё раз.");
    } finally {
      setIsAddingExercise(false);
    }
  }

  async function handleDeleteExercise(workoutExerciseId: number) {
    if (workout === null) {
      return;
    }

    await deleteExerciseFromWorkout(token, workout.id, workoutExerciseId);
    setWorkoutExercises((currentExercises) =>
      currentExercises.filter((item) => item.id !== workoutExerciseId),
    );
  }

  const addedExerciseIds = new Set(
    workoutExercises.map((item) => item.exercise_id),
  );
  const availableExercises = exercises.filter(
    (exercise) => !addedExerciseIds.has(exercise.id),
  );
  const exerciseById = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  );

  return (
    <section className="workout-card">
      <div className="workout-heading">
        <div>
          <p className="eyebrow">Текущая тренировка</p>
          <h2>{workout ? "Тренировка идёт" : "Готов к тренировке?"}</h2>
        </div>
        {workout && (
          <strong className="workout-timer">
            {formatElapsedTime(workout.started_at, currentTime)}
          </strong>
        )}
      </div>

      {workout ? (
        <>
          {isLoadingExercises ? (
            <p>Загружаем упражнения...</p>
          ) : workoutExercises.length > 0 ? (
            <div className="workout-exercise-list">
              {workoutExercises.map((item) => {
                const exercise = exerciseById.get(item.exercise_id);

                return (
                  <WorkoutExerciseCard
                    key={item.id}
                    exercise={exercise}
                    token={token}
                    workoutId={workout.id}
                    workoutExercise={item}
                    onDeleteExercise={handleDeleteExercise}
                  />
                );
              })}
            </div>
          ) : (
            <p>Пока нет упражнений. Добавь первое из каталога.</p>
          )}

          <div className="exercise-picker">
            <label htmlFor="workout-exercise">Добавить упражнение</label>
            <div>
              <select
                id="workout-exercise"
                value={selectedExerciseId}
                onChange={(event) => setSelectedExerciseId(event.target.value)}
                disabled={isAddingExercise || availableExercises.length === 0}
              >
                <option value="">Выбери упражнение</option>
                {availableExercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddExercise}
                disabled={selectedExerciseId === "" || isAddingExercise}
              >
                {isAddingExercise ? "Добавляем..." : "Добавить"}
              </button>
            </div>
            {availableExercises.length === 0 && exercises.length > 0 && (
              <small>Все упражнения каталога уже добавлены.</small>
            )}
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={handleStartWorkout}
          disabled={isStarting}
        >
          {isStarting ? "Начинаем..." : "Начать тренировку"}
        </button>
      )}

      {error && <p className="form-error">{error}</p>}
    </section>
  );
}
