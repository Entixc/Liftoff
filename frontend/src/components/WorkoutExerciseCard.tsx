import { useEffect, useState, type FormEvent } from "react";
import { getLastSet, type Exercise } from "../api/exercises";
import {
  createWorkoutSet,
  deleteWorkoutSet,
  getWorkoutSets,
  updateWorkoutSet,
  type WorkoutExercise,
  type WorkoutSet,
  type UpdateWorkoutSetPayload,
} from "../api/workouts";
import { errorMessage } from "../api/http";
import { categories } from "../lib/format";
import {
  Badge,
  Button,
  ErrorState,
  Icon,
  Input,
  LoadingState,
  useUI,
} from "./ui";
import { SwipeToDelete } from "./SwipeToDelete";

type CardProps = {
  exercise?: Exercise;
  workoutId: number;
  workoutExercise: WorkoutExercise;
  onDeleteExercise: (id: number) => Promise<void>;
  readOnly?: boolean;
  onBusy: (delta: number) => void;
};
function SetRow({
  item,
  bodyweight,
  update,
  remove,
  onBusy,
}: {
  item: WorkoutSet;
  bodyweight: boolean;
  update: (id: number, payload: UpdateWorkoutSetPayload) => Promise<void>;
  remove: (id: number) => Promise<void>;
  onBusy: (delta: number) => void;
}) {
  const [weight, setWeight] = useState(item.weight_kg ?? "");
  const [reps, setReps] = useState(String(item.repetitions));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useUI();
  const dirty =
    weight !== (item.weight_kg ?? "") || reps !== String(item.repetitions);
  async function save(payload: UpdateWorkoutSetPayload) {
    setBusy(true);
    onBusy(1);
    setError(null);
    try {
      await update(item.id, payload);
      notify("Подход сохранён");
    } catch (e) {
      setError(errorMessage(e, "Не удалось сохранить подход."));
    } finally {
      setBusy(false);
      onBusy(-1);
    }
  }
  useEffect(() => {
    setWeight(item.weight_kg ?? "");
    setReps(String(item.repetitions));
  }, [item]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    await save({
      weight_kg: weight === "" ? null : Number(weight),
      repetitions: Number(reps),
    });
  }
  return (
    <SwipeToDelete
      className="set-swipe"
      label="подход"
      message="Вес, повторения и отметка выполнения этого подхода будут удалены."
      disabled={busy}
      onDelete={() => remove(item.id)}
    >
      <form
        className={`set-row ${item.is_completed ? "set-complete" : ""}`}
        onSubmit={submit}
      >
        <label
          className="completion-checkbox"
          title={
            item.is_completed
              ? "Отметить невыполненным"
              : "Отметить выполненным"
          }
        >
          <input
            type="checkbox"
            checked={item.is_completed}
            disabled={busy}
            aria-label="Подход выполнен"
            onChange={(event) => {
              // Completing a set also saves valid edits, rather than discarding its draft.
              if (event.currentTarget.form?.reportValidity())
                void save({
                  is_completed: !item.is_completed,
                  ...(dirty
                    ? {
                        weight_kg: weight === "" ? null : Number(weight),
                        repetitions: Number(reps),
                      }
                    : {}),
                });
            }}
          />
          <span>
            <Icon name="check" size={16} />
          </span>
        </label>
        <Input
          label={bodyweight ? "Доп. вес, кг" : "Вес, кг"}
          type="number"
          inputMode="decimal"
          min="0.01"
          max="999.99"
          step="0.01"
          required={!bodyweight}
          disabled={busy}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Свой вес"
        />
        <Input
          label="Повторения"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          required
          disabled={busy}
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />
        <Button
          type="submit"
          className="set-save"
          variant={dirty ? "primary" : "ghost"}
          disabled={busy || !dirty}
          aria-label="Сохранить подход"
        >
          <Icon name="check" size={18} />
          <span>{busy ? "Сохраняем…" : "Сохранить"}</span>
        </Button>
        {error && (
          <p className="form-error full-row" role="alert">
            {error}
          </p>
        )}
      </form>
    </SwipeToDelete>
  );
}
export function WorkoutExerciseCard({
  exercise,
  workoutId,
  workoutExercise,
  onDeleteExercise,
  readOnly = false,
  onBusy,
}: CardProps) {
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("10");
  const [hasPrevious, setHasPrevious] = useState(false);
  const [adding, setAdding] = useState(false);
  const [operations, setOperations] = useState(0);
  const { notify } = useUI();
  const bodyweight = exercise?.is_bodyweight ?? false;
  const name = exercise?.name ?? "Упражнение";
  function busy(delta: number) {
    setOperations((n) => n + delta);
    onBusy(delta);
  }
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      getWorkoutSets(workoutId, workoutExercise.id),
      readOnly
        ? Promise.resolve(null)
        : getLastSet(workoutExercise.exercise_id),
    ])
      .then(([value, previous]) => {
        if (!cancelled) {
          setSets(value);
          if (previous) {
            setWeight(previous.weight_kg ?? "");
            setReps(String(previous.repetitions));
            setHasPrevious(true);
          } else {
            setWeight("");
            setReps("10");
            setHasPrevious(false);
          }
        }
      })
      .catch((e) => {
        if (!cancelled)
          setLoadError(errorMessage(e, "Не удалось загрузить подходы."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workoutId, workoutExercise.id, readOnly, reload]);
  async function add(event: FormEvent) {
    event.preventDefault();
    setAdding(true);
    busy(1);
    setError(null);
    try {
      const value = await createWorkoutSet(
        workoutId,
        workoutExercise.id,
        {
          weight_kg: weight === "" ? null : Number(weight),
          repetitions: Number(reps),
        },
      );
      setSets((current) => [...current, value]);
      setWeight(value.weight_kg ?? "");
      setReps(String(value.repetitions));
      setHasPrevious(true);
      notify("Подход добавлен");
    } catch (e) {
      setError(
        errorMessage(
          e,
          "Не удалось добавить подход. Проверь вес и повторения.",
        ),
      );
    } finally {
      setAdding(false);
      busy(-1);
    }
  }
  async function update(id: number, payload: UpdateWorkoutSetPayload) {
    const value = await updateWorkoutSet(
      workoutId,
      workoutExercise.id,
      id,
      payload,
    );
    setSets((current) =>
      current.map((item) => (item.id === id ? value : item)),
    );
  }
  async function remove(id: number) {
    busy(1);
    try {
      await deleteWorkoutSet(workoutId, workoutExercise.id, id);
      setSets((current) => current.filter((item) => item.id !== id));
    } finally {
      busy(-1);
    }
  }
  const content = (
    <article className="workout-exercise-card">
      <div className="exercise-heading">
        <span className="exercise-icon">
          <Icon name={bodyweight ? "user" : "workout"} />
        </span>
        <div>
          <p className="eyebrow">
            {categories[exercise?.category ?? ""] ?? "Упражнение"}
          </p>
          <h3>{name}</h3>
        </div>
      </div>
      <div className="exercise-meta">
        <Badge>{bodyweight ? "Собственный вес" : "С отягощением"}</Badge>
        {!loading && !loadError && (
          <span className="muted">
            {sets.filter((s) => s.is_completed).length} из {sets.length}{" "}
            выполнено
          </span>
        )}
      </div>
      {loading ? (
        <LoadingState />
      ) : loadError ? (
        <ErrorState message={loadError} retry={() => setReload((n) => n + 1)} />
      ) : (
        <>
          {sets.length ? (
            <div className="set-list">
              {sets.map((item) =>
                readOnly ? (
                  <div
                    className={`read-set ${item.is_completed ? "is-complete" : ""}`}
                    key={item.id}
                  >
                    <Icon
                      name={item.is_completed ? "check" : "clock"}
                      size={18}
                    />
                    <strong>
                      {item.weight_kg === null
                        ? "Свой вес"
                        : `${Number(item.weight_kg)} кг`}
                    </strong>
                    <span>× {item.repetitions} повт.</span>
                    <Badge>
                      {item.is_completed ? "Выполнен" : "Не выполнен"}
                    </Badge>
                  </div>
                ) : (
                  <SetRow
                    key={item.id}
                    item={item}
                    bodyweight={bodyweight}
                    update={update}
                    remove={remove}
                    onBusy={busy}
                  />
                ),
              )}
            </div>
          ) : (
            <p className="no-sets muted">Подходов пока нет.</p>
          )}
          {!readOnly && (
            <>
              {hasPrevious && (
                <p className="field-hint">
                  Значения последнего подхода подставлены. Можешь изменить их.
                </p>
              )}
              <form className="add-set-form" onSubmit={add}>
                <Input
                  label={bodyweight ? "Доп. вес, кг" : "Вес, кг"}
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  max="999.99"
                  step="0.01"
                  required={!bodyweight}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={bodyweight ? "Необязательно" : "60"}
                />
                <Input
                  label="Повторения"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  required
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                />
                <Button type="submit" disabled={adding}>
                  <Icon name="plus" size={18} />
                  {adding ? "Добавляем…" : "Добавить подход"}
                </Button>
              </form>
            </>
          )}
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
  return readOnly ? (
    content
  ) : (
    <SwipeToDelete
      className="exercise-swipe"
      label={name}
      disabled={operations > 0}
      message="Упражнение и все его подходы будут удалены из этой тренировки."
      onDelete={() => onDeleteExercise(workoutExercise.id)}
    >
      {content}
    </SwipeToDelete>
  );
}
