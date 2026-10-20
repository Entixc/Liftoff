import { useEffect, useState } from "react";

import type { Exercise } from "../api/exercises";
import {
  getWorkoutExercises,
  getWorkoutSets,
  type Workout,
  type WorkoutExercise,
  type WorkoutSet,
} from "../api/workouts";

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
  const [error, setError] = useState<string | null>(null);

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
  }, [token, workout.id]);

  const exerciseById = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  );

  return (
    <section className="history-details">
      <div className="history-details-heading">
        <div>
          <p className="eyebrow">Завершённая тренировка</p>
          <h3>Тренировка #{workout.id}</h3>
        </div>
        <button type="button" onClick={onClose}>
          Закрыть
        </button>
      </div>

      {isLoading ? (
        <p>Загружаем детали...</p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : details.length === 0 ? (
        <p className="muted-text">В этой тренировке не было упражнений.</p>
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
                          {workoutSet.is_completed ? "Выполнен" : "Не выполнен"}
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
    </section>
  );
}
