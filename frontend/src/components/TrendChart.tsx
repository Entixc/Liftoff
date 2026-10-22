import { useId, useState } from "react";

export type TrendPoint = { id: number; date: string; value: number };
export type TrendPeriod = "week" | "month" | "3m" | "6m" | "12m";

export function periodStart(period: TrendPeriod, now = new Date()): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  } else if (period === "month") {
    start.setDate(1);
  } else {
    start.setMonth(start.getMonth() - Number(period.slice(0, -1)) + 1, 1);
  }
  return start;
}

export function TrendChart({
  points,
  unit,
  empty,
}: {
  points: TrendPoint[];
  unit: string;
  empty: string;
}) {
  const [period, setPeriod] = useState<TrendPeriod>("3m");
  const gradientId = useId().replace(/:/g, "");
  const start = periodStart(period).getTime();
  const visible = points
    .filter((point) => {
      const date = Date.parse(point.date);
      return date >= start && date <= Date.now();
    })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id - b.id);
  const values = visible.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const padding = Math.max((high - low) * 0.2, 1);
  const floor = low - padding;
  const ceiling = high + padding;
  const coordinates = visible.map((point, index) => ({
    x: visible.length === 1 ? 50 : 7 + (86 * index) / (visible.length - 1),
    y: 82 - (68 * (point.value - floor)) / (ceiling - floor),
  }));
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = coordinates.length ? `7,88 ${line} 93,88` : "";
  return (
    <div className="trend">
      <label className="trend-period">
        Период
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value as TrendPeriod)}
        >
          <option value="week">Неделя</option>
          <option value="month">Месяц</option>
          <option value="3m">3 месяца</option>
          <option value="6m">6 месяцев</option>
          <option value="12m">12 месяцев</option>
        </select>
      </label>
      {visible.length ? (
        <>
          <div
            className="trend-plot"
            role="img"
            aria-label={`График: ${visible.map((point) => `${new Date(point.date).toLocaleDateString("ru-RU")}: ${point.value} ${unit}`).join(", ")}`}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9dee79" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#9dee79" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[20, 40, 60, 80].map((y) => (
                <line
                  key={y}
                  x1="5"
                  x2="95"
                  y1={y}
                  y2={y}
                  className="trend-grid"
                />
              ))}
              <polygon points={area} fill={`url(#${gradientId})`} />
              <polyline points={line} className="trend-line" />
              {coordinates.map((point, index) => (
                <circle
                  key={visible[index].id}
                  cx={point.x}
                  cy={point.y}
                  r="1.7"
                  className="trend-dot"
                />
              ))}
            </svg>
          </div>
          <div className="trend-caption">
            <span>{new Date(visible[0].date).toLocaleDateString("ru-RU")}</span>
            <strong>
              {visible[visible.length - 1].value.toLocaleString("ru-RU")} {unit}
            </strong>
            <span>
              {new Date(visible[visible.length - 1].date).toLocaleDateString(
                "ru-RU",
              )}
            </span>
          </div>
        </>
      ) : (
        <p className="muted trend-empty">{empty}</p>
      )}
    </div>
  );
}
