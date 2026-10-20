import { useEffect, useState } from "react";
import type { Exercise } from "../api/exercises";
import { completeWorkout, type Workout } from "../api/workouts";
import { errorMessage } from "../api/http";
import { formatElapsed, formatTime } from "../lib/format";
import { WorkoutEditor } from "./WorkoutEditor";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Icon,
  Panel,
  useUI,
} from "./ui";

export function WorkoutTimer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="timer" aria-label="Время тренировки">
      {formatElapsed(startedAt, now)}
    </span>
  );
}
export function ActiveWorkout({
  workout,
  exercises,
  token,
  onStart,
  starting,
  onWorkoutCompleted,
}: {
  workout: Workout | null;
  exercises: Exercise[];
  token: string;
  onStart: () => void;
  starting: boolean;
  onWorkoutCompleted: (workout: Workout) => void;
}) {
  const [completing, setCompleting] = useState(false);
  const [operations, setOperations] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { confirm, notify } = useUI();
  async function finish() {
    if (
      !workout ||
      !(await confirm({
        title: "Сохраним тренировку?",
        message:
          "Все упражнения и подходы попадут в историю. Невыполненные подходы сохранят свою отметку.",
        label: "Завершить тренировку",
      }))
    )
      return;
    setCompleting(true);
    setError(null);
    try {
      onWorkoutCompleted(await completeWorkout(token, workout.id));
      notify("Тренировка сохранена в истории");
    } catch (e) {
      setError(errorMessage(e, "Не удалось завершить тренировку."));
    } finally {
      setCompleting(false);
    }
  }
  if (!workout)
    return (
      <Panel className="start-panel">
        <EmptyState
          title="Время для себя"
          description="Начни тренировку, выбери упражнения и записывай подходы. Остальное мы сохраним."
          action={
            <Button variant="primary" onClick={onStart} disabled={starting}>
              <Icon name="plus" />
              {starting ? "Начинаем…" : "Начать тренировку"}
            </Button>
          }
        />
        <p className="field-hint">
          Записываешь задним числом? После завершения можно исправить время в
          истории.
        </p>
      </Panel>
    );
  return (
    <>
      <div className="session-bar">
        <div>
          <Badge active>Тренировка идёт</Badge>
          <p className="muted">Начало в {formatTime(workout.started_at)}</p>
        </div>
        <WorkoutTimer startedAt={workout.started_at} />
        <Button
          variant="primary"
          onClick={() => void finish()}
          disabled={completing || operations > 0}
        >
          <Icon name="check" />
          <span>{completing ? "Сохраняем…" : "Завершить"}</span>
        </Button>
      </div>
      {error && <ErrorState message={error} />}
      <WorkoutEditor
        token={token}
        workoutId={workout.id}
        exercises={exercises}
        onBusy={(delta) => setOperations((n) => n + delta)}
      />
      <div className="finish-panel">
        <div>
          <h3>На сегодня всё?</h3>
          <p className="muted">Сохрани результат и дай себе восстановиться.</p>
        </div>
        <Button
          onClick={() => void finish()}
          disabled={completing || operations > 0}
        >
          Завершить тренировку
          <Icon name="arrow" />
        </Button>
      </div>
    </>
  );
}
