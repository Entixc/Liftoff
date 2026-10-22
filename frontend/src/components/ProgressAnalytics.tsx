import { useMemo, useState } from "react";
import type { Exercise } from "../api/exercises";
import type { ProgressSet, Workout } from "../api/workouts";
import { Panel } from "./ui";
import { TrendChart } from "./TrendChart";

function countPeriods(history: Workout[]) {
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    week: history.filter((item) => new Date(item.started_at) >= weekStart)
      .length,
    month: history.filter((item) => new Date(item.started_at) >= monthStart)
      .length,
  };
}

export function ProgressAnalytics({
  history,
  sets,
  exercises,
}: {
  history: Workout[];
  sets: ProgressSet[];
  exercises: Exercise[];
}) {
  const [exerciseId, setExerciseId] = useState<number | null>(null);
  const [metric, setMetric] = useState<"weight" | "reps">("weight");
  const counts = useMemo(() => countPeriods(history), [history]);
  const summaries = useMemo(() => {
    const result = new Map<
      number,
      { volume: number; maxWeight: number; maxReps: number }
    >();
    for (const set of sets) {
      const current = result.get(set.exercise_id) ?? {
        volume: 0,
        maxWeight: 0,
        maxReps: 0,
      };
      const weight = set.weight_kg === null ? 0 : Number(set.weight_kg);
      current.volume += weight * set.repetitions;
      current.maxWeight = Math.max(current.maxWeight, weight);
      current.maxReps = Math.max(current.maxReps, set.repetitions);
      result.set(set.exercise_id, current);
    }
    return result;
  }, [sets]);
  const available = exercises.filter((item) => summaries.has(item.id));
  const selected = available.some((item) => item.id === exerciseId)
    ? exerciseId
    : available[0]?.id;
  const byWorkout = new Map<number, { date: string; value: number }>();
  for (const set of sets) {
    if (set.exercise_id !== selected) continue;
    if (metric === "weight" && set.weight_kg === null) continue;
    const value = metric === "weight" ? Number(set.weight_kg) : set.repetitions;
    const current = byWorkout.get(set.workout_id);
    byWorkout.set(set.workout_id, {
      date: set.started_at,
      value: Math.max(value, current?.value ?? 0),
    });
  }
  const points = [...byWorkout.entries()]
    .sort(
      (a, b) => Date.parse(a[1].date) - Date.parse(b[1].date) || a[0] - b[0],
    )
    .map(([id, item]) => ({ id, ...item }));

  return (
    <Panel className="progress-panel">
      <h2>Прогресс</h2>
      <div className="progress-counts">
        <div>
          <strong>{counts.week}</strong>
          <span>тренировок на этой неделе</span>
        </div>
        <div>
          <strong>{counts.month}</strong>
          <span>тренировок в этом месяце</span>
        </div>
      </div>
      {available.length ? (
        <>
          <div className="progress-controls">
            <label>
              Упражнение{" "}
              <select
                value={selected ?? ""}
                onChange={(event) => setExerciseId(Number(event.target.value))}
              >
                {available.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Показатель{" "}
              <select
                value={metric}
                onChange={(event) =>
                  setMetric(event.target.value as "weight" | "reps")
                }
              >
                <option value="weight">Рабочий вес</option>
                <option value="reps">Повторения</option>
              </select>
            </label>
          </div>
          <div className="progress-chart">
            <TrendChart
              points={points}
              unit={metric === "weight" ? "кг" : "повт."}
              empty={
                metric === "weight"
                  ? "За этот период нет подходов с указанным весом."
                  : "За этот период нет выполненных подходов."
              }
            />
          </div>
          <div className="progress-records">
            <div>
              <span>Объём</span>
              <strong>
                {summaries.get(selected!)!.volume.toLocaleString("ru-RU")} кг
              </strong>
            </div>
            <div>
              <span>Рекорд веса</span>
              <strong>
                {summaries.get(selected!)!.maxWeight
                  ? `${summaries.get(selected!)!.maxWeight} кг`
                  : "—"}
              </strong>
            </div>
            <div>
              <span>Рекорд повторений</span>
              <strong>{summaries.get(selected!)!.maxReps}</strong>
            </div>
          </div>
          <details>
            <summary>Объём по всем упражнениям</summary>
            <ul>
              {available.map((item) => (
                <li key={item.id}>
                  {item.name}:{" "}
                  {summaries.get(item.id)!.volume.toLocaleString("ru-RU")} кг
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <p className="muted">
          Отметь подходы выполненными и заверши тренировку — здесь появятся
          график и рекорды.
        </p>
      )}
    </Panel>
  );
}
