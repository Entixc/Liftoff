import { useState, type FormEvent } from "react";
import type { Exercise } from "../api/exercises";
import { updateWorkoutTime, type Workout } from "../api/workouts";
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
export function WorkoutHistoryDetails({
  exercises,
  token,
  workout,
  onClose,
  onWorkoutUpdated,
}: {
  exercises: Exercise[];
  token: string;
  workout: Workout;
  onClose: () => void;
  onWorkoutUpdated: (workout: Workout) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(() => localInput(workout.started_at));
  const [finish, setFinish] = useState(() => localInput(workout.finished_at));
  const [saving, setSaving] = useState(false);
  const [operations, setOperations] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useUI();
  async function saveTime(event: FormEvent) {
    event.preventDefault();
    const started = new Date(start),
      finished = new Date(finish);
    if (
      !Number.isFinite(started.getTime()) ||
      !Number.isFinite(finished.getTime())
    ) {
      setError("Укажи обе даты.");
      return;
    }
    if (started >= finished) {
      setError("Начало должно быть раньше окончания.");
      return;
    }
    if (finished.getTime() > Date.now()) {
      setError("Окончание не может находиться в будущем.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateWorkoutTime(token, workout.id, {
        started_at: started.toISOString(),
        finished_at: finished.toISOString(),
      });
      onWorkoutUpdated(updated);
      setStart(localInput(updated.started_at));
      setFinish(localInput(updated.finished_at));
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
          variant={editing ? "primary" : "secondary"}
          disabled={operations > 0 || saving}
          onClick={() => {
            setEditing(!editing);
            setError(null);
            setStart(localInput(workout.started_at));
            setFinish(localInput(workout.finished_at));
          }}
        >
          <Icon name={editing ? "check" : "edit"} />
          {editing ? "Готово" : "Редактировать"}
        </Button>
      </div>
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
            Время указано в часовом поясе твоего устройства.
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
              label="Окончание"
              type="datetime-local"
              step="1"
              required
              value={finish}
              disabled={saving}
              onChange={(e) => setFinish(e.target.value)}
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
        token={token}
        workoutId={workout.id}
        exercises={exercises}
        readOnly={!editing}
        onBusy={(delta) => setOperations((n) => n + delta)}
      />
    </div>
  );
}
