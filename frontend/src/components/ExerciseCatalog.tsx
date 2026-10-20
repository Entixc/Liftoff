import { useState } from "react";
import type { Exercise } from "../api/exercises";
import { categories } from "../lib/format";
import { Badge, Button, EmptyState, Icon } from "./ui";

// Shared by the catalog and workout picker.
export function ExerciseCatalog({
  exercises,
  onAdd,
  busy = false,
  picker = false,
}: {
  exercises: Exercise[];
  onAdd?: (exercise: Exercise) => Promise<void>;
  busy?: boolean;
  picker?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const filtered = exercises.filter(
    (e) =>
      (!category || e.category === category) &&
      e.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <section className={picker ? "catalog catalog-picker" : "catalog"}>
      <label className="search-field">
        <Icon name="search" />
        <input
          aria-label="Поиск упражнений"
          placeholder="Найти упражнение…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            className="icon-button"
            aria-label="Очистить поиск"
            onClick={() => setQuery("")}
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </label>
      <div className="category-tabs" aria-label="Категории упражнений">
        {[["", "Все"], ...Object.entries(categories)].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={category === value}
            className={category === value ? "chip selected" : "chip"}
            onClick={() => setCategory(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="catalog-count muted">
        {picker ? "Доступно для добавления" : "Упражнений в каталоге"}{" "}
        <span>{filtered.length}</span>
      </p>
      {filtered.length ? (
        <div className="catalog-grid">
          {filtered.map((exercise) => (
            <article className="catalog-card" key={exercise.id}>
              <span className="exercise-icon">
                <Icon
                  name={exercise.is_bodyweight ? "user" : "workout"}
                  size={24}
                />
              </span>
              <div className="catalog-card-content">
                <span className="eyebrow">
                  {categories[exercise.category] ?? exercise.category}
                </span>
                <h3>{exercise.name}</h3>
                <Badge>
                  {exercise.is_bodyweight ? "Собственный вес" : "С отягощением"}
                </Badge>
              </div>
              {onAdd && (
                <Button
                  className="icon-button"
                  variant="ghost"
                  disabled={busy}
                  aria-label={`Добавить ${exercise.name}`}
                  onClick={() => void onAdd(exercise)}
                >
                  <Icon name="plus" />
                </Button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="search"
          title={exercises.length ? "Ничего не найдено" : "Список пуст"}
          description={
            exercises.length
              ? "Попробуй другое название или категорию."
              : picker
                ? "Все доступные упражнения уже добавлены или каталог пока пуст."
                : "Упражнения появятся после заполнения каталога."
          }
          action={
            exercises.length > 0 && (
              <Button
                onClick={() => {
                  setQuery("");
                  setCategory("");
                }}
              >
                Сбросить фильтры
              </Button>
            )
          }
        />
      )}
    </section>
  );
}
