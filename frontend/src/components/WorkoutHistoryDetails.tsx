import { type FormEvent, useEffect, useState } from "react";

import type { Exercise } from "../api/exercises";
import {
  addExerciseToWorkout,
  deleteExerciseFromWorkout,
  getWorkoutExercises,
  getWorkoutSets,
  updateWorkoutTime,
  type Workout,
  type WorkoutExercise,
  type WorkoutSet,
} from "../api/workouts";
import { WorkoutExerciseCard } from "./WorkoutExerciseCard";

type WorkoutHistoryDetailsProps = {
  exercises: Exercise[];
  token: string;
  workout: Workout;
  onClose: () => void;
  onWorkoutUpdated: (workout: Workout) => void;
};

type ExerciseDetails = {
  workoutExercise: WorkoutExercise;
  sets: WorkoutSet[];
};

function toDateTimeLocal(value: string | null): string {
  if (value === null) {
    return "";
  }

  const date = new Date(value);
  const localTime = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return localTime.toISOString().slice(0, 16);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WorkoutHistoryDetails({
  exercises,
  token,
  workout,
  onClose,
  onWorkoutUpdated,
}: WorkoutHistoryDetailsProps) {
  const [details, setDetails] = useState<ExerciseDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(() =>
    toDateTimeLocal(workout.started_at),
  );
  const [finishedAt, setFinishedAt] = useState(() =>
    toDateTimeLocal(workout.finished_at),
  );
  const [isSavingTime, setIsSavingTime] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    setStartedAt(toDateTimeLocal(workout.started_at));
    setFinishedAt(toDateTimeLocal(workout.finished_at));
  }, [workout.started_at, workout.finished_at]);

  useEffect(() => {
    let isCancelled = false;

    async function loadDetails() {
      setIsLoading(true);
      setError(null);
      try {
        const workoutExercises = await getWorkoutExercises(token, workout.id);
        const loadedDetails = await Promise.all(
          workoutExercises.map(async (workoutExercise) => ({
            workoutExercise,
            sets: await getWorkoutSets(
              token,
              workout.id,
              workoutExercise.id,
            ),
          })),
        );
        if (!isCancelled) {
          setDetails(loadedDetails);
        }
      } catch {
        if (!isCancelled) {
          setError("Не удалось загрузить детали тренировки.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDetails();
    return () => {
      isCancelled = true;
    };
  }, [reloadVersion, token, workout.id]);

  const exerciseById = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  );
  const addedExerciseIds = new Set(
    details.map(({ workoutExercise }) => workoutExercise.exercise_id),
  );
  const availableExercises = exercises.filter(
    (exercise) => !addedExerciseIds.has(exercise.id),
  );

  async function handleAddExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedExerciseId === "") {
      return;
    }

    setIsAddingExercise(true);
    setActionError(null);
    try {
      const workoutExercise = await addExerciseToWorkout(
        token,
        workout.id,
        Number(selectedExerciseId),
      );
      setDetails((currentDetails) => [
        ...currentDetails,
        { workoutExercise, sets: [] },
      ]);
      setSelectedExerciseId("");
    } catch {
      setActionError(
        "Не удалось добавить упражнение в сохранённую тренировку.",
      );
    } finally {
      setIsAddingExercise(false);
    }
  }

  async function handleDeleteExercise(workoutExerciseId: number) {
    await deleteExerciseFromWorkout(token, workout.id, workoutExerciseId);
    setDetails((currentDetails) =>
      currentDetails.filter(
        ({ workoutExercise }) => workoutExercise.id !== workoutExerciseId,
      ),
    );
  }

  async function handleSaveTime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedStartedAt = new Date(startedAt);
    const parsedFinishedAt = new Date(finishedAt);

    if (
      Number.isNaN(parsedStartedAt.getTime()) ||
      Number.isNaN(parsedFinishedAt.getTime())
    ) {
      setTimeError("Укажи время начала и окончания.");
      return;
    }
    if (parsedStartedAt >= parsedFinishedAt) {
      setTimeError("Начало должно быть раньше окончания.");
      return;
    }
    if (parsedFinishedAt > new Date()) {
      setTimeError("Окончание не может находиться в будущем.");
      return;
    }

    setIsSavingTime(true);
    setTimeError(null);
    try {
      const updatedWorkout = await updateWorkoutTime(token, workout.id, {
        started_at: parsedStartedAt.toISOString(),
        finished_at: parsedFinishedAt.toISOString(),
      });
      onWorkoutUpdated(updatedWorkout);
    } catch {
      setTimeError("Не удалось сохранить время тренировки.");
    } finally {
      setIsSavingTime(false);
    }
  }

  function finishEditing() {
    setIsEditing(false);
    setActionError(null);
    setReloadVersion((currentVersion) => currentVersion + 1);
  }

  return (
    <section className="history-details">
      <div className="history-details-heading">
        <div>
          <p className="eyebrow">Завершённая тренировка</p>
          <h3>Тренировка #{workout.id}</h3>
        </div>
        <div className="history-details-actions">
          {isEditing ? (
            <button type="button" onClick={finishEditing} disabled={isLoading}>
              Готово
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={isLoading}
            >
              Редактировать
            </button>
          )}
          <button type="button" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>

      {isLoading ? (
        <p>Загружаем детали...</p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : (
        <>
          {isEditing ? (
            <form className="history-time-form" onSubmit={handleSaveTime}>
              <label>
                <span>Начало</span>
                <input
                  type="datetime-local"
                  value={startedAt}
                  onChange={(event) => setStartedAt(event.target.value)}
                  required
                />
              </label>
              <label>
                <span>Окончание</span>
                <input
                  type="datetime-local"
                  value={finishedAt}
                  max={toDateTimeLocal(new Date().toISOString())}
                  onChange={(event) => setFinishedAt(event.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={isSavingTime}>
                {isSavingTime ? "Сохраняем..." : "Сохранить время"}
              </button>
              {timeError && <p className="form-error">{timeError}</p>}
            </form>
          ) : (
            <div className="history-time-summary">
              <span>Начало: {formatDateTime(workout.started_at)}</span>
              <span>
                Окончание:{" "}
                {workout.finished_at === null
                  ? "не указано"
                  : formatDateTime(workout.finished_at)}
              </span>
            </div>
          )}

          {details.length === 0 ? (
            <p className="muted-text">В этой тренировке не было упражнений.</p>
          ) : isEditing ? (
            <div className="workout-exercise-list">
              {details.map(({ workoutExercise }) => (
                <WorkoutExerciseCard
                  key={workoutExercise.id}
                  exercise={exerciseById.get(workoutExercise.exercise_id)}
                  token={token}
                  workoutId={workout.id}
                  workoutExercise={workoutExercise}
                  onDeleteExercise={handleDeleteExercise}
                />
              ))}
            </div>
          ) : (
            <div className="history-exercise-list">
              {details.map(({ workoutExercise, sets }) => {
                const exercise = exerciseById.get(workoutExercise.exercise_id);

                return (
                  <article key={workoutExercise.id}>
                    <h4>
                      {exercise?.name ??
                        `Упражнение #${workoutExercise.exercise_id}`}
                    </h4>
                    {sets.length === 0 ? (
                      <p className="muted-text">Без подходов</p>
                    ) : (
                      <div className="history-set-table">
                        <div className="history-set-header">
                          <span>Подход</span>
                          <span>Вес</span>
                          <span>Повторы</span>
                          <span>Статус</span>
                        </div>
                        {sets.map((workoutSet) => (
                          <div key={workoutSet.id}>
                            <span>#{workoutSet.position}</span>
                            <span>
                              {workoutSet.weight_kg === null
                                ? "Свой вес"
                                : `${workoutSet.weight_kg} кг`}
                            </span>
                            <span>{workoutSet.repetitions}</span>
                            <span>
                              {workoutSet.is_completed
                                ? "Выполнен"
                                : "Не выполнен"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {isEditing && (
            <>
              <form className="exercise-picker" onSubmit={handleAddExercise}>
                <label htmlFor={`history-exercise-${workout.id}`}>
                  Добавить упражнение
                </label>
                <div>
                  <select
                    id={`history-exercise-${workout.id}`}
                    value={selectedExerciseId}
                    onChange={(event) =>
                      setSelectedExerciseId(event.target.value)
                    }
                    disabled={availableExercises.length === 0}
                  >
                    <option value="">Выбери упражнение</option>
                    {availableExercises.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={
                      selectedExerciseId === "" ||
                      isAddingExercise ||
                      availableExercises.length === 0
                    }
                  >
                    {isAddingExercise ? "Добавляем..." : "Добавить"}
                  </button>
                </div>
              </form>
              {actionError && <p className="form-error">{actionError}</p>}
            </>
          )}
        </>
      )}
    </section>
  );
}
