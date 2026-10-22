import { useEffect, useState } from "react";
import {
  getExerciseDetail,
  getExerciseHistory,
  type ExerciseDetail,
  type ExerciseHistory,
  type ExerciseHistoryWorkout,
} from "../api/exercises";
import { errorMessage } from "../api/http";
import { categories, formatDate, formatTime } from "../lib/format";
import { Badge, Button, ErrorState, LoadingState, Panel } from "./ui";
import { MuscleDiagram } from "./MuscleDiagram";

function WorkoutEntry({
  entry,
  active,
}: {
  entry: ExerciseHistoryWorkout;
  active: boolean;
}) {
  return (
    <li className="exercise-history-entry">
      <div>
        <strong>{formatDate(entry.started_at)}</strong>
        <span className="muted">{formatTime(entry.started_at)}</span>
      </div>
      <ul>
        {entry.sets.length ? (
          entry.sets.map((set) => (
            <li key={set.id}>
              {set.weight_kg === null
                ? "Собственный вес"
                : `${Number(set.weight_kg)} кг`}{" "}
              · {set.repetitions} повт. ·{" "}
              {set.is_completed ? "Выполнен" : "Не выполнен"}
            </li>
          ))
        ) : (
          <li className="muted">Подходов пока нет</li>
        )}
      </ul>
      <a
        className="text-link"
        href={active ? "#/workout" : `#/history/${entry.workout_id}`}
      >
        {active ? "К текущей тренировке" : "Открыть тренировку"}
      </a>
    </li>
  );
}

export function ExerciseDetails({
  exerciseId,
  onBack,
}: {
  exerciseId: number;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [history, setHistory] = useState<ExerciseHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setHistory(null);
    setError(null);
    Promise.all([
      getExerciseDetail(exerciseId),
      getExerciseHistory(exerciseId),
    ])
      .then(([exercise, workouts]) => {
        if (!cancelled) {
          setDetail(exercise);
          setHistory(workouts);
        }
      })
      .catch((cause) => {
        if (!cancelled)
          setError(errorMessage(cause, "Не удалось загрузить упражнение."));
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId, reload]);
  if (error)
    return (
      <ErrorState
        message={error}
        retry={() => setReload((value) => value + 1)}
      />
    );
  if (!detail || !history) return <LoadingState />;
  const primary = detail.muscles.filter((muscle) => muscle.role === "primary");
  const secondary = detail.muscles.filter(
    (muscle) => muscle.role === "secondary",
  );
  return (
    <div className="exercise-details">
      <Button variant="ghost" onClick={onBack}>
        ← К каталогу
      </Button>
      <div className="exercise-detail-header">
        <div>
          <span className="eyebrow">
            {categories[detail.category] ?? detail.category}
          </span>
          <h1>{detail.name}</h1>
        </div>
        <Badge>
          {detail.is_bodyweight ? "Собственный вес" : "С отягощением"}
        </Badge>
      </div>
      <div className="exercise-detail-grid">
        <Panel>
          <h2>Мышцы</h2>
          <MuscleDiagram muscles={detail.muscles} />
          <div className="exercise-muscle-lists">
            <div>
              <h3>Primary</h3>
              <ul>
                {primary.map((muscle) => (
                  <li key={muscle.slug}>{muscle.name_en}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Secondary</h3>
              <ul>
                {secondary.length ? (
                  secondary.map((muscle) => (
                    <li key={muscle.slug}>{muscle.name_en}</li>
                  ))
                ) : (
                  <li className="muted">—</li>
                )}
              </ul>
            </div>
          </div>
        </Panel>
        <Panel>
          <h2>How to perform</h2>
          <p className="exercise-instructions" lang="en">
            {detail.description_en || "Instructions are not available yet."}
          </p>
        </Panel>
      </div>
      <Panel>
        <h2>История упражнения</h2>
        {history.active && (
          <section className="exercise-active-history">
            <h3>Текущая тренировка</h3>
            <ul>
              <WorkoutEntry entry={history.active} active />
            </ul>
          </section>
        )}
        <h3>Завершённые тренировки</h3>
        {history.completed.length ? (
          <ul className="exercise-history-list">
            {history.completed.map((entry) => (
              <WorkoutEntry
                key={entry.workout_id}
                entry={entry}
                active={false}
              />
            ))}
          </ul>
        ) : (
          <p className="muted">
            Это упражнение ещё не встречалось в завершённых тренировках.
          </p>
        )}
      </Panel>
    </div>
  );
}
