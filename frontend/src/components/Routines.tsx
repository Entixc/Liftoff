import { useRef, useState, type FormEvent } from "react";
import type { Exercise } from "../api/exercises";
import { deleteRoutine, saveRoutine, type Routine } from "../api/routines";
import { errorMessage } from "../api/http";
import { Button, EmptyState, Icon, Input, Panel, useUI } from "./ui";

type SetDraft = { key: number; weight: string; repetitions: string };

export function Routines({
  routines,
  exercises,
  active,
  onSaved,
  onDeleted,
  onStart,
}: {
  routines: Routine[];
  exercises: Exercise[];
  active: boolean;
  onSaved: (routine: Routine) => void;
  onDeleted: (id: number) => void;
  onStart: (id: number) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [ids, setIds] = useState<number[]>([]);
  const [drafts, setDrafts] = useState<Record<number, SetDraft[]>>({});
  const nextDraftKey = useRef(0);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, notify } = useUI();
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  function makeDraft(weight = "", repetitions = "10"): SetDraft {
    return { key: ++nextDraftKey.current, weight, repetitions };
  }

  function edit(routine?: Routine) {
    setEditingId(routine?.id ?? null);
    setName(routine?.name ?? "");
    setIds(routine?.exercise_ids ?? []);
    const existing: Record<number, SetDraft[]> = {};
    for (const planned of routine?.planned_sets ?? []) {
      (existing[planned.exercise_id] ??= []).push(
        makeDraft(planned.weight_kg ?? "", String(planned.repetitions)),
      );
    }
    setDrafts(existing);
    setSelected("");
    setError(null);
    setOpen(true);
  }
  function move(index: number, delta: number) {
    const updated = [...ids];
    [updated[index], updated[index + delta]] = [
      updated[index + delta],
      updated[index],
    ];
    setIds(updated);
  }
  function addSet(exerciseId: number) {
    setDrafts((current) => {
      const previous = current[exerciseId]?.at(-1);
      return {
        ...current,
        [exerciseId]: [
          ...(current[exerciseId] ?? []),
          makeDraft(previous?.weight, previous?.repetitions),
        ],
      };
    });
  }
  function changeSet(
    exerciseId: number,
    key: number,
    changes: Partial<SetDraft>,
  ) {
    setDrafts((current) => ({
      ...current,
      [exerciseId]: (current[exerciseId] ?? []).map((item) =>
        item.key === key ? { ...item, ...changes } : item,
      ),
    }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ids.length) {
      setError("Добавь хотя бы одно упражнение.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await saveRoutine(
        {
          name: name.trim(),
          exercise_ids: ids,
          planned_sets: ids.flatMap((exerciseId) =>
            (drafts[exerciseId] ?? []).map((item) => ({
              exercise_id: exerciseId,
              weight_kg: item.weight === "" ? null : Number(item.weight),
              repetitions: Number(item.repetitions),
            })),
          ),
        },
        editingId ?? undefined,
      );
      onSaved(saved);
      setOpen(false);
      notify(editingId ? "Рутина обновлена" : "Рутина сохранена");
    } catch (e) {
      setError(errorMessage(e, "Не удалось сохранить рутину."));
    } finally {
      setBusy(false);
    }
  }
  async function remove(routine: Routine) {
    if (
      !(await confirm({
        title: `Удалить «${routine.name}»?`,
        message: "История тренировок не изменится.",
        label: "Удалить рутину",
        danger: true,
      }))
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await deleteRoutine(routine.id);
      onDeleted(routine.id);
      notify("Рутина удалена");
    } catch (e) {
      setError(errorMessage(e, "Не удалось удалить рутину."));
    } finally {
      setBusy(false);
    }
  }
  async function launch(id: number) {
    setBusy(true);
    setError(null);
    try {
      await onStart(id);
    } catch (e) {
      setError(
        errorMessage(
          e,
          "Не удалось начать рутину. Проверь, нет ли активной тренировки.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="routines-page">
      <div className="routines-toolbar">
        <p className="muted">
          Собери упражнения и подходы один раз. При запуске рутины останется
          отметить выполненное.
        </p>
        <Button
          variant="primary"
          onClick={() => edit()}
          disabled={busy || open}
        >
          <Icon name="plus" />
          Создать рутину
        </Button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {open && (
        <Panel className="routine-editor">
          <form onSubmit={(event) => void submit(event)}>
            <div className="section-heading">
              <h2>{editingId ? "Изменить рутину" : "Новая рутина"}</h2>
            </div>
            <Input
              label="Название рутины"
              value={name}
              maxLength={80}
              required
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например, День груди"
            />
            <label className="field">
              <span>Добавить упражнение</span>
              <select
                aria-label="Добавить упражнение"
                value={selected}
                disabled={busy}
                onChange={(event) => {
                  const id = Number(event.target.value);
                  if (id && !ids.includes(id))
                    setIds((current) => [...current, id]);
                  setSelected("");
                }}
              >
                <option value="">Выбери из каталога</option>
                {exercises
                  .filter((exercise) => !ids.includes(exercise.id))
                  .map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
              </select>
            </label>
            {ids.length ? (
              <ol className="routine-exercise-list">
                {ids.map((id, index) => (
                  <li key={id}>
                    <div className="routine-exercise-heading">
                      <strong>
                        {byId.get(id)?.name ?? `Упражнение ${id}`}
                      </strong>
                      <div className="routine-reorder">
                        <button
                          type="button"
                          aria-label={`Поднять ${byId.get(id)?.name}`}
                          disabled={busy || index === 0}
                          onClick={() => move(index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Опустить ${byId.get(id)?.name}`}
                          disabled={busy || index === ids.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          aria-label={`Убрать ${byId.get(id)?.name}`}
                          disabled={busy}
                          onClick={() =>
                            setIds((current) =>
                              current.filter((value) => value !== id),
                            )
                          }
                        >
                          <Icon name="close" size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="routine-set-editor">
                      {(drafts[id] ?? []).map((item) => (
                        <div className="routine-set-row" key={item.key}>
                          <Input
                            label={
                              byId.get(id)?.is_bodyweight
                                ? "Доп. вес, кг"
                                : "Вес, кг"
                            }
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            max="999.99"
                            step="0.01"
                            required={!byId.get(id)?.is_bodyweight}
                            disabled={busy}
                            value={item.weight}
                            onChange={(event) =>
                              changeSet(id, item.key, {
                                weight: event.target.value,
                              })
                            }
                            placeholder={
                              byId.get(id)?.is_bodyweight ? "Свой вес" : "60"
                            }
                          />
                          <Input
                            label="Повторения"
                            type="number"
                            inputMode="numeric"
                            min="1"
                            step="1"
                            required
                            disabled={busy}
                            value={item.repetitions}
                            onChange={(event) =>
                              changeSet(id, item.key, {
                                repetitions: event.target.value,
                              })
                            }
                          />
                          <Button
                            variant="ghost"
                            aria-label={`Убрать подход для ${byId.get(id)?.name}`}
                            disabled={busy}
                            onClick={() =>
                              setDrafts((current) => ({
                                ...current,
                                [id]: (current[id] ?? []).filter(
                                  (draft) => draft.key !== item.key,
                                ),
                              }))
                            }
                          >
                            <Icon name="trash" size={17} />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        disabled={busy || (drafts[id]?.length ?? 0) >= 30}
                        onClick={() => addSet(id)}
                        aria-label={`Добавить подход для ${byId.get(id)?.name}`}
                      >
                        <Icon name="plus" size={17} />
                        Добавить подход
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="field-hint">
                В рутине должно быть хотя бы одно упражнение.
              </p>
            )}
            <div className="routine-actions">
              <Button
                type="submit"
                variant="primary"
                disabled={busy || !name.trim() || !ids.length}
              >
                {busy ? "Сохраняем…" : "Сохранить рутину"}
              </Button>
              <Button disabled={busy} onClick={() => setOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </Panel>
      )}
      {routines.length ? (
        <div className="routine-grid">
          {routines.map((routine) => (
            <Panel className="routine-card" key={routine.id}>
              <span className="exercise-icon">
                <Icon name="routine" />
              </span>
              <h2>{routine.name}</h2>
              <p className="muted">{routine.exercise_ids.length} упражнений</p>
              <ul>
                {routine.exercise_ids.map((id) => (
                  <li key={id}>
                    <strong>{byId.get(id)?.name ?? `Упражнение ${id}`}</strong>
                    {(routine.planned_sets ?? [])
                      .filter((item) => item.exercise_id === id)
                      .map((item) => (
                        <span
                          className="routine-set-summary"
                          key={`${id}-${item.position}`}
                        >
                          {item.weight_kg === null
                            ? "Свой вес"
                            : `${Number(item.weight_kg)} кг`}{" "}
                          × {item.repetitions}
                        </span>
                      ))}
                  </li>
                ))}
              </ul>
              <div className="routine-actions">
                <Button
                  variant="primary"
                  disabled={busy || active}
                  onClick={() => void launch(routine.id)}
                >
                  <Icon name="workout" />
                  Начать
                </Button>
                <Button disabled={busy} onClick={() => edit(routine)}>
                  Изменить
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  aria-label={`Удалить ${routine.name}`}
                  onClick={() => void remove(routine)}
                >
                  <Icon name="trash" />
                </Button>
              </div>
              {active && (
                <p className="field-hint">
                  Сначала заверши текущую тренировку.
                </p>
              )}
            </Panel>
          ))}
        </div>
      ) : !open ? (
        <Panel>
          <EmptyState
            icon="routine"
            title="Пока нет рутин"
            description="Создай свой порядок упражнений или сохрани завершённую тренировку как рутину."
            action={<Button onClick={() => edit()}>Создать рутину</Button>}
          />
        </Panel>
      ) : null}
    </div>
  );
}
