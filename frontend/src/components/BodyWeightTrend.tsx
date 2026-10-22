import type { BodyWeightEntry } from "../api/auth";
import { Panel } from "./ui";
import { TrendChart } from "./TrendChart";

export function BodyWeightTrend({ entries }: { entries: BodyWeightEntry[] }) {
  return (
    <Panel className="body-weight-panel">
      <div className="section-heading">
        <h2>Вес тела</h2>
        <a className="text-link" href="#/profile">
          Изменить вес
        </a>
      </div>
      <p className="muted">Изменение веса по записям профиля</p>
      <TrendChart
        points={entries.map((entry) => ({
          id: entry.id,
          date: entry.recorded_at,
          value: Number(entry.weight_kg),
        }))}
        unit="кг"
        empty="Пока нет измерений за этот период. Добавь вес в профиле."
      />
    </Panel>
  );
}
