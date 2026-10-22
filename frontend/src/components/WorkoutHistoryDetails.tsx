import { useState, type FormEvent } from "react";
import type { Exercise } from "../api/exercises";
import {
  getWorkoutExercises,
  getWorkoutSets,
  updateWorkoutTime,
  type Workout,
} from "../api/workouts";
import { saveRoutine, type Routine } from "../api/routines";
import { errorMessage } from "../api/http";
import { formatDate, formatDuration, formatTime } from "../lib/format";
import { Badge, Button, Icon, Input, Panel, useUI } from "./ui";
import { WorkoutEditor } from "./WorkoutEditor";

function localInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
}
function durationParts(workout: Workout) {
  const minutes = workout.finished_at
    ? Math.max(1, Math.round((Date.parse(workout.finished_at) - Date.parse(workout.started_at)) / 60000))
    : 1;
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}
export function WorkoutHistoryDetails({
  exercises,
  workout,
  onClose,
  onWorkoutUpdated,
  onRoutineSaved,
}: {
  exercises: Exercise[];
  workout: Workout;
  onClose: () => void;
  onWorkoutUpdated: (workout: Workout) => void;
  onRoutineSaved: (routine: Routine) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(() => localInput(workout.started_at));
  const [duration, setDuration] = useState(() => durationParts(workout));
  const [saving, setSaving] = useState(false);
  const [operations, setOperations] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [routineOpen, setRoutineOpen] = useState(false);
  const [routineName, setRoutineName] = useState("");
  const [routineSaving, setRoutineSaving] = useState(false);
  const [routineError, setRoutineError] = useState<string | null>(null);
  const { notify } = useUI();
  async function saveAsRoutine(event: FormEvent) {
    event.preventDefault();
    setRoutineSaving(true);
    setRoutineError(null);
    try {
      const workoutExercises = await getWorkoutExercises(workout.id);
      if (!workoutExercises.length) {
        setRoutineError("В тренировке нет упражнений для рутины.");
        return;
      }
      const sets = await Promise.all(
        workoutExercises.map((item) =>
          getWorkoutSets(workout.id, item.id),
        ),
      );
      const saved = await saveRoutine({
        name: routineName.trim(),
        exercise_ids: workoutExercises.map((item) => item.exercise_id),
        planned_sets: workoutExercises.flatMap((item, index) =>
          sets[index].map((set) => ({
            exercise_id: item.exercise_id,
            weight_kg: set.weight_kg === null ? null : Number(set.weight_kg),
            repetitions: set.repetitions,
          })),
        ),
      });
      onRoutineSaved(saved);
      setRoutineOpen(false);
      setRoutineName("");
      notify("Рутина сохранена");
    } catch (e) {
      setRoutineError(errorMessage(e, "Не удалось сохранить рутину."));
    } finally {
      setRoutineSaving(false);
    }
  }
  async function saveTime(event: FormEvent) {
    event.preventDefault();
    const started = new Date(start);
    const durationMinutes = duration.hours * 60 + duration.minutes;
    if (!Number.isFinite(started.getTime())) {
      setError("Укажи дату и время начала.");
      return;
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
      setError("Длительность должна быть от 1 минуты до 24 часов.");
      return;
    }
    if (started.getTime() + durationMinutes * 60000 > Date.now()) {
      setError("Окончание не может находиться в будущем.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateWorkoutTime(workout.id, {
        started_at: started.toISOString(),
        duration_minutes: durationMinutes,
      });
      onWorkoutUpdated(updated);
      setStart(localInput(updated.started_at));
      setDuration(durationParts(updated));
      notify("Время тренировки обновлено");
    } catch (e) {
      setError(errorMessage(e, "Не удалось сохранить время тренировки."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="history-details">
      <div className="details-toolbar">
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={operations > 0 || saving}
        >
          <Icon name="back" />В историю
        </Button>
        <Button
          disabled={operations > 0 || routineSaving}
          onClick={() => {
            setRoutineOpen((value) => !value);
            setRoutineError(null);
          }}
        >
          <Icon name="routine" />
          Сохранить как рутину
        </Button>
        <Button
          variant={editing ? "primary" : "secondary"}
          disabled={operations > 0 || saving}
          onClick={() => {
            setEditing(!editing);
            setError(null);
            setStart(localInput(workout.started_at));
            setDuration(durationParts(workout));
          }}
        >
          <Icon name={editing ? "check" : "edit"} />
          {editing ? "Готово" : "Редактировать"}
        </Button>
      </div>
      {routineOpen && (
        <Panel className="routine-from-history">
          <form onSubmit={(event) => void saveAsRoutine(event)}>
            <h2>Новая рутина из тренировки</h2>
            <p className="muted">
              Сохранятся упражнения, подходы, веса и повторения. Время и отметки
              выполнения не копируются.
            </p>
            <Input
              label="Название рутины"
              value={routineName}
              required
              maxLength={80}
              disabled={routineSaving}
              onChange={(event) => setRoutineName(event.target.value)}
              placeholder="Например, День груди"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={routineSaving || !routineName.trim()}
            >
              {routineSaving ? "Сохраняем…" : "Сохранить рутину"}
            </Button>
            {routineError && (
              <p className="form-error" role="alert">
                {routineError}
              </p>
            )}
          </form>
        </Panel>
      )}
      <Panel className="history-summary">
        <div>
          <Badge active>Завершена</Badge>
          <h1>{formatDate(workout.started_at)}</h1>
          <p className="muted">Твоя сохранённая тренировка</p>
        </div>
        <div className="duration-large">
          <Icon name="clock" />
          <strong>{formatDuration(workout)}</strong>
          <span>
            {formatTime(workout.started_at)} —{" "}
            {workout.finished_at ? formatTime(workout.finished_at) : "—"}
          </span>
        </div>
      </Panel>
      {editing && (
        <Panel>
          <div className="section-heading">
            <h2>Время тренировки</h2>
            <Icon name="clock" />
          </div>
          <p className="muted">
            Укажи начало и длительность. Окончание посчитается автоматически, даже если тренировка закончилась на следующий день.
          </p>
          <form className="history-time-form" onSubmit={saveTime}>
            <Input
              label="Начало"
              type="datetime-local"
              step="1"
              required
              value={start}
              disabled={saving}
              onChange={(e) => setStart(e.target.value)}
            />
            <Input
              label="Часы"
              type="number"
              min="0"
              max="24"
              required
              value={duration.hours}
              disabled={saving}
              onChange={(e) => setDuration((value) => ({ ...value, hours: Number(e.target.value) }))}
            />
            <Input
              label="Минуты"
              type="number"
              min="0"
              max="59"
              required
              value={duration.minutes}
              disabled={saving}
              onChange={(e) => setDuration((value) => ({ ...value, minutes: Number(e.target.value) }))}
            />
            <Button type="submit" disabled={saving}>
              {saving ? "Сохраняем…" : "Сохранить время"}
            </Button>
            {error && (
              <p className="form-error full-row" role="alert">
                {error}
              </p>
            )}
          </form>
          <p className="field-hint">
            Время и каждый подход сохраняются своими кнопками. «Готово»
            закрывает редактор.
          </p>
        </Panel>
      )}
      <WorkoutEditor
        workoutId={workout.id}
        exercises={exercises}
        readOnly={!editing}
        onBusy={(delta) => setOperations((n) => n + delta)}
      />
    </div>
  );
}
