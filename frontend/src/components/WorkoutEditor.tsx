import { useEffect, useState } from "react";
import type { Exercise } from "../api/exercises";
import {
  addExerciseToWorkout,
  deleteExerciseFromWorkout,
  getWorkoutExercises,
  type WorkoutExercise,
} from "../api/workouts";
import { errorMessage } from "../api/http";
import { ExerciseCatalog } from "./ExerciseCatalog";
import { WorkoutExerciseCard } from "./WorkoutExerciseCard";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Panel,
  useUI,
} from "./ui";

export function WorkoutEditor({
  workoutId,
  exercises,
  readOnly = false,
  onBusy,
}: {
  workoutId: number;
  exercises: Exercise[];
  readOnly?: boolean;
  onBusy: (delta: number) => void;
}) {
  const [items, setItems] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [picker, setPicker] = useState(false);
  const [adding, setAdding] = useState(false);
  const { notify } = useUI();
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getWorkoutExercises(workoutId)
      .then((value) => {
        if (!cancelled) setItems(value);
      })
      .catch((e) => {
        if (!cancelled)
          setLoadError(errorMessage(e, "Не удалось загрузить упражнения."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workoutId, reload]);
  async function add(exercise: Exercise) {
    setAdding(true);
    onBusy(1);
    setError(null);
    try {
      const item = await addExerciseToWorkout(workoutId, exercise.id);
      setItems((current) => [...current, item]);
      notify(`${exercise.name} добавлено`);
    } catch (e) {
      setError(
        errorMessage(
          e,
          "Не удалось добавить упражнение. Возможно, оно уже добавлено в другой вкладке.",
        ),
      );
    } finally {
      setAdding(false);
      onBusy(-1);
    }
  }
  async function remove(id: number) {
    onBusy(1);
    try {
      await deleteExerciseFromWorkout(workoutId, id);
      setItems((current) => current.filter((item) => item.id !== id));
    } finally {
      onBusy(-1);
    }
  }
  if (loading) return <LoadingState />;
  if (loadError)
    return (
      <ErrorState message={loadError} retry={() => setReload((n) => n + 1)} />
    );
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const used = new Set(items.map((e) => e.exercise_id));
  return (
    <div className="workout-editor">
      <div className="section-heading">
        <h2>
          Упражнения <span className="count">{items.length}</span>
        </h2>
        {!readOnly && (
          <span className="swipe-hint">Свайп влево или ··· для удаления</span>
        )}
      </div>
      {items.length ? (
        <div className="workout-exercise-list">
          {items.map((item) => (
            <WorkoutExerciseCard
              key={item.id}
              workoutId={workoutId}
              workoutExercise={item}
              exercise={byId.get(item.exercise_id)}
              readOnly={readOnly}
              onDeleteExercise={remove}
              onBusy={onBusy}
            />
          ))}
        </div>
      ) : (
        <Panel>
          <EmptyState
            title={readOnly ? "Без упражнений" : "Начни с первого упражнения"}
            description={
              readOnly
                ? "В этой тренировке не записаны упражнения."
                : "Выбери упражнение из каталога и запиши первый подход."
            }
          />
        </Panel>
      )}
      {!readOnly && (
        <Panel className="picker-panel">
          <Button
            className="picker-trigger"
            variant="ghost"
            onClick={() => setPicker(!picker)}
            aria-expanded={picker}
          >
            <Icon name={picker ? "close" : "plus"} />
            {picker ? "Закрыть каталог" : "Добавить упражнение"}
            <span className="muted">Из твоего каталога</span>
          </Button>
          {picker && (
            <ExerciseCatalog
              picker
              exercises={exercises.filter((e) => !used.has(e.id))}
              onAdd={add}
              busy={adding}
            />
          )}
          {error && <ErrorState message={error} />}
        </Panel>
      )}
    </div>
  );
}
