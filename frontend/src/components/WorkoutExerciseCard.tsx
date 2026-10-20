import { type FormEvent, useEffect, useState } from "react";

import type { Exercise } from "../api/exercises";
import {
  createWorkoutSet,
  deleteWorkoutSet,
  getWorkoutSets,
  updateWorkoutSet,
  type UpdateWorkoutSetPayload,
  type WorkoutExercise,
  type WorkoutSet,
} from "../api/workouts";

type WorkoutExerciseCardProps = {
  exercise: Exercise | undefined;
  token: string;
  workoutId: number;
  workoutExercise: WorkoutExercise;
};

type WorkoutSetRowProps = {
  isBodyweight: boolean;
  workoutSet: WorkoutSet;
  onDelete: (setId: number) => Promise<void>;
  onUpdate: (
    setId: number,
    payload: UpdateWorkoutSetPayload,
  ) => Promise<void>;
};

function WorkoutSetRow({
  isBodyweight,
  workoutSet,
  onDelete,
  onUpdate,
}: WorkoutSetRowProps) {
  const [weight, setWeight] = useState(workoutSet.weight_kg ?? "");
  const [repetitions, setRepetitions] = useState(
    String(workoutSet.repetitions),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWeight(workoutSet.weight_kg ?? "");
    setRepetitions(String(workoutSet.repetitions));
  }, [workoutSet]);

  async function saveChanges() {
    const repetitionsNumber = Number(repetitions);
    if (repetitionsNumber <= 0 || (!isBodyweight && weight === "")) {
      setError("Проверь вес и количество повторений.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onUpdate(workoutSet.id, {
        weight_kg: weight === "" ? null : Number(weight),
        repetitions: repetitionsNumber,
      });
    } catch {
      setError("Не удалось сохранить подход.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleCompleted() {
    setIsSaving(true);
    setError(null);
    try {
      await onUpdate(workoutSet.id, {
        is_completed: !workoutSet.is_completed,
      });
    } catch {
      setError("Не удалось изменить статус подхода.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeSet() {
    if (!window.confirm("Удалить этот подход?")) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onDelete(workoutSet.id);
    } catch {
      setError("Не удалось удалить подход.");
      setIsSaving(false);
    }
  }

  return (
    <li className={workoutSet.is_completed ? "set-row set-row-completed" : "set-row"}>
      <label className="set-completed">
        <input
          type="checkbox"
          checked={workoutSet.is_completed}
          onChange={toggleCompleted}
          disabled={isSaving}
        />
        <span>#{workoutSet.position}</span>
      </label>
      <label>
        <span>{isBodyweight ? "Доп. вес, кг" : "Вес, кг"}</span>
        <input
          type="number"
          min="0.01"
          max="999.99"
          step="0.01"
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
          placeholder={isBodyweight ? "Необязательно" : "0"}
          disabled={isSaving}
        />
      </label>
      <label>
        <span>Повторения</span>
        <input
          type="number"
          min="1"
          step="1"
          value={repetitions}
          onChange={(event) => setRepetitions(event.target.value)}
          disabled={isSaving}
        />
      </label>
      <div className="set-actions">
        <button type="button" onClick={saveChanges} disabled={isSaving}>
          Сохранить
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={removeSet}
          disabled={isSaving}
        >
          Удалить
        </button>
      </div>
      {error && <p className="form-error set-error">{error}</p>}
    </li>
  );
}

export function WorkoutExerciseCard({
  exercise,
  token,
  workoutId,
  workoutExercise,
}: WorkoutExerciseCardProps) {
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([]);
  const [weight, setWeight] = useState("");
  const [repetitions, setRepetitions] = useState("10");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadSets() {
      setIsLoading(true);
      setError(null);
      try {
        const loadedSets = await getWorkoutSets(
          token,
          workoutId,
          workoutExercise.id,
        );
        if (!isCancelled) {
          setWorkoutSets(loadedSets);
        }
      } catch {
        if (!isCancelled) {
          setError("Не удалось загрузить подходы.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSets();
    return () => {
      isCancelled = true;
    };
  }, [token, workoutId, workoutExercise.id]);

  async function handleAddSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const repetitionsNumber = Number(repetitions);
    const isBodyweight = exercise?.is_bodyweight ?? false;
    if (repetitionsNumber <= 0 || (!isBodyweight && weight === "")) {
      setError("Укажи вес и положительное количество повторений.");
      return;
    }

    setIsAdding(true);
    setError(null);
    try {
      const createdSet = await createWorkoutSet(
        token,
        workoutId,
        workoutExercise.id,
        {
          weight_kg: weight === "" ? null : Number(weight),
          repetitions: repetitionsNumber,
        },
      );
      setWorkoutSets((currentSets) => [...currentSets, createdSet]);
      setRepetitions("10");
    } catch {
      setError("Не удалось добавить подход. Проверь введённые значения.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleUpdateSet(
    setId: number,
    payload: UpdateWorkoutSetPayload,
  ) {
    const updatedSet = await updateWorkoutSet(
      token,
      workoutId,
      workoutExercise.id,
      setId,
      payload,
    );
    setWorkoutSets((currentSets) =>
      currentSets.map((item) => (item.id === setId ? updatedSet : item)),
    );
  }

  async function handleDeleteSet(setId: number) {
    await deleteWorkoutSet(
      token,
      workoutId,
      workoutExercise.id,
      setId,
    );
    setWorkoutSets((currentSets) =>
      currentSets.filter((item) => item.id !== setId),
    );
  }

  const isBodyweight = exercise?.is_bodyweight ?? false;

  return (
    <article className="workout-exercise-card">
      <div className="workout-exercise-heading">
        <div>
          <small>Упражнение {workoutExercise.position}</small>
          <h3>{exercise?.name ?? `Упражнение #${workoutExercise.exercise_id}`}</h3>
        </div>
        {isBodyweight && <span className="exercise-badge">Свой вес</span>}
      </div>

      {isLoading ? (
        <p>Загружаем подходы...</p>
      ) : workoutSets.length > 0 ? (
        <ol className="set-list">
          {workoutSets.map((workoutSet) => (
            <WorkoutSetRow
              key={workoutSet.id}
              workoutSet={workoutSet}
              isBodyweight={isBodyweight}
              onUpdate={handleUpdateSet}
              onDelete={handleDeleteSet}
            />
          ))}
        </ol>
      ) : (
        <p className="muted-text">Подходов пока нет.</p>
      )}

      <form className="add-set-form" onSubmit={handleAddSet}>
        <label>
          <span>{isBodyweight ? "Доп. вес, кг" : "Вес, кг"}</span>
          <input
            type="number"
            min="0.01"
            max="999.99"
            step="0.01"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            placeholder={isBodyweight ? "Необязательно" : "0"}
            required={!isBodyweight}
          />
        </label>
        <label>
          <span>Повторения</span>
          <input
            type="number"
            min="1"
            step="1"
            value={repetitions}
            onChange={(event) => setRepetitions(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={isAdding}>
          {isAdding ? "Добавляем..." : "Добавить подход"}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}
    </article>
  );
}
