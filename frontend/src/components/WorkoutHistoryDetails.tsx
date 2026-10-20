import { type FormEvent, useEffect, useState } from "react";

import type { Exercise } from "../api/exercises";
import {
  addExerciseToWorkout,
  deleteExerciseFromWorkout,
  getWorkoutExercises,
  getWorkoutSets,
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
};

type ExerciseDetails = {
  workoutExercise: WorkoutExercise;
  sets: WorkoutSet[];
};

export function WorkoutHistoryDetails({
  exercises,
  token,
  workout,
  onClose,
}: WorkoutHistoryDetailsProps) {
  const [details, setDetails] = useState<ExerciseDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
