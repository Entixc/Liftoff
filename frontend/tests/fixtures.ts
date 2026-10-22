import { expect, type Page } from "@playwright/test";
import type { Workout, WorkoutExercise, WorkoutSet } from "../src/api/workouts";
import type { Routine } from "../src/api/routines";

// Stateful fake API: browser tests never touch a real account or database.
export async function mockAPI(page: Page, authenticated = true) {
  const profile = {
    id: 1,
    nickname: "nurzhan",
    height_cm: 180,
    body_weight_kg: "75.50",
    created_at: "2026-10-01T10:00:00Z",
  };
  const exercises = [
    {
      id: 1,
      name: "Barbell Bench Press",
      category: "chest",
      is_bodyweight: false,
    },
    { id: 2, name: "Pull-Ups", category: "back", is_bodyweight: true },
    {
      id: 3,
      name: "Barbell Back Squat",
      category: "legs",
      is_bodyweight: false,
    },
    { id: 4, name: "Barbell Curl", category: "arms", is_bodyweight: false },
    {
      id: 5,
      name: "Dumbbell Shoulder Press",
      category: "shoulders",
      is_bodyweight: false,
    },
    { id: 6, name: "Crunches", category: "core", is_bodyweight: true },
  ];
  const history: Workout[] = [
    {
      id: 1,
      user_id: 1,
      started_at: "2026-10-18T09:00:00Z",
      finished_at: "2026-10-18T09:52:00Z",
      status: "completed",
    },
    {
      id: 2,
      user_id: 1,
      started_at: "2026-10-16T10:00:00Z",
      finished_at: "2026-10-16T11:05:00Z",
      status: "completed",
    },
    {
      id: 3,
      user_id: 1,
      started_at: "2026-10-14T09:00:00Z",
      finished_at: "2026-10-14T09:47:00Z",
      status: "completed",
    },
  ];
  const weightEntries = [
    { id: 1, weight_kg: "75.50", recorded_at: "2026-10-18T10:00:00Z" },
  ];
  let active: Workout | null = null;
  const items: WorkoutExercise[] = [
    { id: 1, workout_id: 1, exercise_id: 1, position: 1 },
  ];
  const sets: WorkoutSet[] = [
    {
      id: 1,
      workout_exercise_id: 1,
      weight_kg: "60.00",
      repetitions: 10,
      is_completed: true,
      position: 1,
    },
  ];
  const routines: Routine[] = [];
  const state = {
    unauthorized: false,
    offline: false,
    failDelete: false,
    items,
    sets,
    history,
    routines,
    profile,
  };
  let itemId = 2,
    setId = 2,
    routineId = 1;
  if (authenticated)
    await page.addInitScript(() =>
      localStorage.setItem("access_token", "ui-test-token"),
    );
  await page.route("**/mock-api/**", async (route) => {
    if (state.offline) {
      await route.abort("connectionrefused");
      return;
    }
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/mock-api", "");
    const method = request.method();
    const body = request.postData() ? request.postDataJSON() : {};
    const respond = (json: unknown, status = 200) =>
      route.fulfill({ json, status });
    if (state.unauthorized && request.headers().authorization)
      return respond({ detail: "Not authenticated" }, 401);
    if (path === "/auth/login") {
      if (body.password === "wrongpassword") return respond({}, 401);
      return respond({ access_token: "ui-test-token", token_type: "bearer" });
    }
    if (path === "/auth/register") {
      if (body.nickname === "taken") return respond({}, 409);
      return respond({ ...profile, nickname: body.nickname }, 201);
    }
    if (path === "/auth/me/weight-history") return respond(weightEntries);
    if (path === "/auth/me") {
      if (method === "PATCH") {
        if (
          body.body_weight_kg !== null &&
          body.body_weight_kg !== undefined &&
          Number(body.body_weight_kg) !== Number(profile.body_weight_kg)
        )
          weightEntries.push({
            id: weightEntries.length + 1,
            weight_kg: Number(body.body_weight_kg).toFixed(2),
            recorded_at: new Date().toISOString(),
          });
        Object.assign(profile, body);
      }
      return respond(profile);
    }
    if (path === "/exercises") return respond(exercises);
    const lastSet = path.match(/^\/exercises\/(\d+)\/last-set$/);
    if (lastSet) {
      const matchingItems = items.filter(
        (item) => item.exercise_id === Number(lastSet[1]),
      );
      const latest = sets
        .filter((set) =>
          matchingItems.some((item) => item.id === set.workout_exercise_id),
        )
        .sort((a, b) => b.id - a.id)[0];
      return respond(latest ?? {}, latest ? 200 : 404);
    }
    if (path === "/routines" && method === "GET") return respond(routines);
    if (path === "/routines" && method === "POST") {
      const routine = {
        id: routineId++,
        name: body.name,
        exercise_ids: body.exercise_ids,
        planned_sets: (body.planned_sets ?? []).map(
          (
            item: {
              exercise_id: number;
              weight_kg: number | null;
              repetitions: number;
            },
            index: number,
            all: Array<{ exercise_id: number }>,
          ) => ({
            ...item,
            weight_kg:
              item.weight_kg === null
                ? null
                : Number(item.weight_kg).toFixed(2),
            position:
              all
                .slice(0, index)
                .filter((previous) => previous.exercise_id === item.exercise_id)
                .length + 1,
          }),
        ),
        created_at: new Date().toISOString(),
      };
      routines.unshift(routine);
      return respond(routine, 201);
    }
    const routine = path.match(/^\/routines\/(\d+)(\/start)?$/);
    if (routine) {
      const id = Number(routine[1]);
      const saved = routines.find((item) => item.id === id);
      if (!saved) return respond({}, 404);
      if (routine[2] && method === "POST") {
        if (active) return respond({}, 409);
        active = {
          id: 4,
          user_id: 1,
          started_at: new Date().toISOString(),
          finished_at: null,
          status: "active",
        };
        saved.exercise_ids.forEach((exerciseId, index) => {
          const item = {
            id: itemId++,
            workout_id: 4,
            exercise_id: exerciseId,
            position: index + 1,
          };
          items.push(item);
          saved.planned_sets
            .filter((planned) => planned.exercise_id === exerciseId)
            .forEach((planned) =>
              sets.push({
                id: setId++,
                workout_exercise_id: item.id,
                weight_kg: planned.weight_kg,
                repetitions: planned.repetitions,
                is_completed: false,
                position: planned.position,
              }),
            );
        });
        return respond(active, 201);
      }
      if (method === "PUT") {
        Object.assign(saved, body, {
          planned_sets: (body.planned_sets ?? []).map(
            (
              item: {
                exercise_id: number;
                weight_kg: number | null;
                repetitions: number;
              },
              index: number,
              all: Array<{ exercise_id: number }>,
            ) => ({
              ...item,
              weight_kg:
                item.weight_kg === null
                  ? null
                  : Number(item.weight_kg).toFixed(2),
              position:
                all
                  .slice(0, index)
                  .filter(
                    (previous) => previous.exercise_id === item.exercise_id,
                  ).length + 1,
            }),
          ),
        });
        return respond(saved);
      }
      if (method === "DELETE") {
        routines.splice(routines.indexOf(saved), 1);
        return route.fulfill({ status: 204 });
      }
    }
    if (path === "/workouts/active")
      return respond(active ?? {}, active ? 200 : 404);
    if (path === "/workouts/history") return respond(history);
    if (path === "/workouts/progress")
      return respond(
        sets
          .filter((item) => item.is_completed)
          .flatMap((item) => {
            const exercise = items.find(
              (entry) => entry.id === item.workout_exercise_id,
            );
            const workout = history.find(
              (entry) => entry.id === exercise?.workout_id,
            );
            return exercise && workout
              ? [
                  {
                    workout_id: workout.id,
                    started_at: workout.started_at,
                    exercise_id: exercise.exercise_id,
                    weight_kg: item.weight_kg,
                    repetitions: item.repetitions,
                  },
                ]
              : [];
          }),
      );
    if (path === "/workouts" && method === "POST") {
      active = {
        id: 4,
        user_id: 1,
        started_at: new Date(Date.now() - 65 * 60000).toISOString(),
        finished_at: null,
        status: "active",
      };
      return respond(active, 201);
    }
    const cancel = path.match(/^\/workouts\/(\d+)$/);
    if (cancel && method === "DELETE") {
      if (state.failDelete) return respond({}, 500);
      if (!active || active.id !== Number(cancel[1])) return respond({}, 404);
      const removedItems = items.filter(
        (item) => item.workout_id === active?.id,
      );
      const removedIds = new Set(removedItems.map((item) => item.id));
      for (let index = sets.length - 1; index >= 0; index--)
        if (removedIds.has(sets[index].workout_exercise_id))
          sets.splice(index, 1);
      for (let index = items.length - 1; index >= 0; index--)
        if (items[index].workout_id === active.id) items.splice(index, 1);
      active = null;
      return route.fulfill({ status: 204 });
    }
    const complete = path.match(/^\/workouts\/(\d+)\/complete$/);
    if (complete && active) {
      const finished: Workout = {
        ...active,
        finished_at: new Date().toISOString(),
        status: "completed",
      };
      history.unshift(finished);
      active = null;
      return respond(finished);
    }
    const time = path.match(/^\/workouts\/(\d+)\/time$/);
    if (time) {
      const workout = history.find((item) => item.id === Number(time[1]))!;
      workout.started_at = body.started_at;
      workout.finished_at = new Date(
        Date.parse(body.started_at) + body.duration_minutes * 60000,
      ).toISOString();
      return respond(workout);
    }
    const set = path.match(
      /^\/workouts\/(\d+)\/exercises\/(\d+)\/sets(?:\/(\d+))?$/,
    );
    if (set) {
      const exerciseId = Number(set[2]),
        id = Number(set[3]);
      if (method === "GET")
        return respond(
          sets.filter((item) => item.workout_exercise_id === exerciseId),
        );
      if (method === "POST") {
        const value = {
          id: setId++,
          workout_exercise_id: exerciseId,
          weight_kg:
            body.weight_kg === null ? null : Number(body.weight_kg).toFixed(2),
          repetitions: body.repetitions,
          is_completed: false,
          position: sets.length + 1,
        };
        sets.push(value);
        return respond(value, 201);
      }
      if (method === "PATCH") {
        const value = sets.find((item) => item.id === id)!;
        Object.assign(value, body);
        if (value.weight_kg !== null)
          value.weight_kg = Number(value.weight_kg).toFixed(2);
        return respond(value);
      }
      if (method === "DELETE") {
        if (state.failDelete) return respond({}, 500);
        sets.splice(
          sets.findIndex((item) => item.id === id),
          1,
        );
        return route.fulfill({ status: 204 });
      }
    }
    const exercise = path.match(/^\/workouts\/(\d+)\/exercises(?:\/(\d+))?$/);
    if (exercise) {
      const workoutId = Number(exercise[1]),
        id = Number(exercise[2]);
      if (method === "GET")
        return respond(items.filter((item) => item.workout_id === workoutId));
      if (method === "POST") {
        const value = {
          id: itemId++,
          workout_id: workoutId,
          exercise_id: body.exercise_id,
          position: items.length + 1,
        };
        items.push(value);
        return respond(value, 201);
      }
      if (method === "DELETE") {
        if (state.failDelete) return respond({}, 500);
        items.splice(
          items.findIndex((item) => item.id === id),
          1,
        );
        return route.fulfill({ status: 204 });
      }
    }
    throw new Error(`Unmocked request: ${method} ${path}`);
  });
  return state;
}

export async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

export async function startWithExercise(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Начать тренировку", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Добавить упражнение", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Добавить Barbell Bench Press", exact: true })
    .click();
  await expect(page.locator(".workout-exercise-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Закрыть каталог", exact: false })
    .click();
}
