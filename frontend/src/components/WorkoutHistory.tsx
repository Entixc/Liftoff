import type { Workout } from "../api/workouts";
import { formatDate, formatDuration, formatTime } from "../lib/format";
import { Badge, Button, EmptyState, Icon } from "./ui";

export function WorkoutHistory({
  workouts,
  onOpen,
  onStart,
  compact = false,
}: {
  workouts: Workout[];
  onOpen: (workout: Workout) => void;
  onStart: () => void;
  compact?: boolean;
}) {
  if (!workouts.length)
    return (
      <EmptyState
        icon="history"
        title="Твоя история начинается здесь"
        description="Завершённые тренировки появятся здесь. Каждый записанный подход — часть твоего пути."
        action={
          <Button onClick={onStart}>
            К тренировке
            <Icon name="arrow" />
          </Button>
        }
      />
    );
  return (
    <div className={`history-list ${compact ? "history-compact" : ""}`}>
      {workouts.map((workout) => {
        const date = new Date(workout.started_at);
        return (
          <button
            key={workout.id}
            className="history-item"
            onClick={() => onOpen(workout)}
          >
            <span className="date-tile">
              <strong>{date.getDate()}</strong>
              <span>
                {new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(
                  date,
                )}
              </span>
            </span>
            <span className="history-item-title">
              <strong>{formatDate(workout.started_at)}</strong>
              <span className="muted">
                {formatTime(workout.started_at)} —{" "}
                {workout.finished_at ? formatTime(workout.finished_at) : "—"}
              </span>
            </span>
            <span className="history-duration">
              <Icon name="clock" size={16} />
              {formatDuration(workout)}
            </span>
            {!compact && <Badge active>Завершена</Badge>}
            <Icon name="arrow" size={19} />
          </button>
        );
      })}
    </div>
  );
}
