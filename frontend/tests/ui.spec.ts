import { test, expect } from "@playwright/test";
import { mockAPI, noOverflow, startWithExercise } from "./fixtures";

test("routine starts with planned sets and cancellation removes the active workout", async ({
  page,
}) => {
  const state = await mockAPI(page);
  await page.goto("/#/routines");
  await page.getByRole("button", { name: "Создать рутину" }).first().click();
  await page.getByLabel("Название рутины").fill("Heavy bench");
  await page.getByLabel("Добавить упражнение").selectOption("1");
  await page
    .getByRole("button", { name: "Добавить подход для Barbell Bench Press" })
    .click();
  const first = page.locator(".routine-set-row").first();
  await first.getByLabel("Вес, кг").fill("60");
  await first.getByLabel("Повторения").fill("10");
  await page
    .getByRole("button", { name: "Добавить подход для Barbell Bench Press" })
    .click();
  const second = page.locator(".routine-set-row").nth(1);
  await second.getByLabel("Вес, кг").fill("65");
  await second.getByLabel("Повторения").fill("8");
  await page.setViewportSize({ width: 320, height: 720 });
  await noOverflow(page);
  await page.getByRole("button", { name: "Сохранить рутину" }).click();
  expect(
    state.routines[0].planned_sets.map((item) => item.repetitions),
  ).toEqual([10, 8]);
  await page
    .locator(".routine-card")
    .getByRole("button", { name: "Начать" })
    .click();
  await expect(page.locator(".set-row")).toHaveCount(2);
  await expect(
    page.locator(".set-row").first().getByLabel("Вес, кг"),
  ).toHaveValue("60.00");
  await expect(
    page.locator(".set-row").nth(1).getByLabel("Вес, кг"),
  ).toHaveValue("65.00");
  await expect(
    page.locator(".set-row").first().getByRole("checkbox"),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Отменить", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("безвозвратно удалены");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Отмена" })
    .click();
  await expect(page.locator(".set-row")).toHaveCount(2);
  await page.getByRole("button", { name: "Отменить", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Удалить тренировку" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Время для себя" }),
  ).toBeVisible();
  expect(state.items.filter((item) => item.workout_id === 4)).toHaveLength(0);
  expect(
    state.sets.filter((set) => set.workout_exercise_id !== 1),
  ).toHaveLength(0);
  expect(state.history).toHaveLength(3);
  expect(state.routines).toHaveLength(1);
  await noOverflow(page);
});

test("routine can be created, reordered and started with last-set hints", async ({
  page,
}) => {
  const state = await mockAPI(page);
  await page.goto("/#/routines");
  await page.getByRole("button", { name: "Создать рутину" }).first().click();
  await page.getByLabel("Название рутины").fill("Push day");
  await page.getByLabel("Добавить упражнение").selectOption("1");
  await page.getByLabel("Добавить упражнение").selectOption("2");
  await page.getByRole("button", { name: "Поднять Pull-Ups" }).click();
  await page.getByRole("button", { name: "Сохранить рутину" }).click();
  await expect(page.locator(".routine-card")).toHaveCount(1);
  expect(state.routines[0].exercise_ids).toEqual([2, 1]);
  await page
    .locator(".routine-card")
    .getByRole("button", { name: "Начать" })
    .click();
  await expect(page.locator(".workout-exercise-card")).toHaveCount(2);
  const bench = page
    .locator(".workout-exercise-card")
    .filter({ hasText: "Barbell Bench Press" });
  await expect(
    bench.locator(".add-set-form").getByLabel("Вес, кг"),
  ).toHaveValue("60.00");
  await expect(
    bench.locator(".add-set-form").getByLabel("Повторения"),
  ).toHaveValue("10");
  await expect(
    bench.getByText("Значения последнего подхода подставлены"),
  ).toBeVisible();
  await noOverflow(page);
});

test("completed workout can be saved and edited as a routine", async ({
  page,
}) => {
  const state = await mockAPI(page);
  await page.goto("/#/history/1");
  await page.getByRole("button", { name: "Сохранить как рутину" }).click();
  await page.getByLabel("Название рутины").fill("Из истории");
  await page.getByRole("button", { name: "Сохранить рутину" }).click();
  await expect(page.getByText("Рутина сохранена")).toBeVisible();
  expect(state.routines[0].planned_sets).toHaveLength(1);
  await page.goto("/#/routines");
  await expect(page.locator(".routine-card")).toContainText("Из истории");
  await page
    .locator(".routine-card")
    .getByRole("button", { name: "Изменить" })
    .click();
  await page.getByLabel("Название рутины").fill("Новая версия");
  await page.getByRole("button", { name: "Сохранить рутину" }).click();
  expect(state.routines[0].name).toBe("Новая версия");
  await page.getByRole("button", { name: "Удалить Новая версия" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Удалить рутину" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Пока нет рутин" }),
  ).toBeVisible();
});

test("navigation, catalog filters, profile and responsive layout", async ({
  page,
}, testInfo) => {
  await mockAPI(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Привет, nurzhan." }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
  });
  const nav = page.getByRole("navigation", {
    name:
      testInfo.project.name === "mobile"
        ? "Мобильная навигация"
        : "Основная навигация",
  });
  await nav.getByRole("link", { name: "Упражнения", exact: true }).click();
  await page.getByRole("button", { name: "Спина", exact: true }).click();
  await expect(page.locator(".catalog-card")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Pull-Ups" })).toBeVisible();
  await page.getByRole("textbox", { name: "Поиск упражнений" }).fill("missing");
  await expect(
    page.getByRole("heading", { name: "Ничего не найдено" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Сбросить фильтры" }).click();
  await expect(page.locator(".catalog-card")).toHaveCount(6);
  await page.screenshot({
    path: testInfo.outputPath("catalog.png"),
    fullPage: true,
  });
  await noOverflow(page);
  await page.getByRole("link", { name: "Открыть профиль" }).click();
  await page.getByLabel("Рост, см").fill("182");
  await page.getByLabel("Вес, кг").fill("");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(page.getByText("Данные профиля сохранены")).toBeVisible();
  await nav.getByRole("link", { name: "Главная", exact: true }).click();
  await expect(page.locator(".profile-metrics")).toContainText("182");
  await expect(page.locator(".profile-metrics")).toContainText("—");
  await nav.getByRole("link", { name: "История", exact: true }).click();
  await page.locator(".history-item").first().click();
  await expect(page.locator(".read-set")).toHaveCount(1);
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("history.png"),
    fullPage: true,
  });
});

test("registration, password toggle, login failure and success", async ({
  page,
}, testInfo) => {
  await mockAPI(page, false);
  await page.goto("/");
  await page.screenshot({
    path: testInfo.outputPath("login.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Регистрация", exact: true }).click();
  await page.getByLabel("Никнейм", { exact: true }).fill("newuser");
  await page.getByLabel("Пароль", { exact: true }).fill("testpassword");
  await page.getByLabel("Повтори пароль", { exact: true }).fill("different");
  await page
    .getByRole("button", { name: "Создать аккаунт", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText("Пароли не совпадают.");
  await page.getByLabel("Повтори пароль", { exact: true }).fill("testpassword");
  await page.getByLabel("Никнейм", { exact: true }).fill("taken");
  await page
    .getByRole("button", { name: "Создать аккаунт", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("занят");
  await page.getByLabel("Никнейм", { exact: true }).fill("newuser");
  await page
    .getByRole("button", { name: "Создать аккаунт", exact: true })
    .click();
  await expect(
    page.getByText("Аккаунт создан. Теперь можно войти."),
  ).toBeVisible();
  await expect(page.getByLabel("Никнейм")).toHaveValue("newuser");
  await page.getByLabel("Пароль", { exact: true }).fill("wrongpassword");
  await page
    .getByRole("button", { name: "Показать пароль", exact: true })
    .click();
  await expect(page.getByLabel("Пароль", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Неверный никнейм");
  await page.getByLabel("Пароль", { exact: true }).fill("testpassword");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Привет, nurzhan." }),
  ).toBeVisible();
});

test("full workout: create, edit, completion, history and time", async ({
  page,
}, testInfo) => {
  const state = await mockAPI(page);
  await startWithExercise(page);
  const addForm = page.locator(".add-set-form");
  await addForm.getByLabel("Вес, кг", { exact: true }).fill("60");
  await addForm.getByLabel("Повторения").fill("10");
  await addForm.getByRole("button", { name: "Добавить подход" }).click();
  const row = page.locator(".set-row");
  await expect(row).toHaveCount(1);
  await row.getByLabel("Вес, кг", { exact: true }).fill("62.5");
  await row
    .getByRole("button", { name: "Сохранить подход", exact: true })
    .click();
  await expect(row.getByLabel("Вес, кг", { exact: true })).toHaveValue("62.50");
  await row.getByLabel("Повторения").fill("12");
  // This controlled checkbox changes only after the API confirms the save.
  await row.getByRole("checkbox", { name: "Подход выполнен" }).click();
  await expect(row.getByRole("checkbox")).toBeChecked();
  await expect(row.getByLabel("Повторения")).toHaveValue("12");
  expect(
    state.sets.find((item) => item.workout_exercise_id !== 1)?.repetitions,
  ).toBe(12);
  await expect(page.getByText("1 из 1 выполнено")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("workout.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Завершить", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Завершить тренировку" })
    .click();
  await expect(page.locator(".history-summary")).toBeVisible();
  await expect(page.locator(".read-set")).toContainText("62.5 кг");
  await expect(page.locator(".read-set")).toContainText("Выполнен");
  await page
    .getByRole("button", { name: "Редактировать", exact: true })
    .click();
  await page.getByLabel("Начало", { exact: true }).fill("2026-10-10T10:00");
  await page.getByLabel("Часы", { exact: true }).fill("0");
  await page.getByLabel("Минуты", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Сохранить время" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Длительность должна быть",
  );
  await page.getByLabel("Часы", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Сохранить время" }).click();
  await expect(page.getByText("Время тренировки обновлено")).toBeVisible();
  expect(
    Date.parse(state.history[0].finished_at!) -
      Date.parse(state.history[0].started_at),
  ).toBe(3600000);
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await expect(page.locator(".read-set")).toBeVisible();
});

test("progress appears on home and history with volume and records", async ({
  page,
}) => {
  await mockAPI(page);
  await page.goto("/");
  await expect(page.locator(".progress-panel")).toContainText("Прогресс");
  await expect(page.locator(".progress-panel")).toContainText("600 кг");
  await expect(page.locator(".progress-panel")).toContainText("60 кг");
  await page.goto("/#/history");
  await expect(page.locator(".progress-panel")).toContainText("600 кг");
  await page.locator(".progress-panel select").nth(1).selectOption("reps");
  await expect(page.locator(".progress-chart .trend-plot")).toHaveAttribute(
    "aria-label",
    /10/,
  );
});

test("exercise page shows muscles, instructions and history", async ({
  page,
}, testInfo) => {
  await mockAPI(page);
  await page.goto("/#/catalog");
  await page
    .getByRole("button", { name: /Подробнее об упражнении/ })
    .first()
    .click();
  await expect(page.locator(".exercise-details h1")).toHaveText(
    "Barbell Bench Press",
  );
  await expect(page.locator(".exercise-muscle-lists")).toContainText(
    "Middle chest",
  );
  await expect(page.locator(".exercise-muscle-lists")).toContainText("Triceps");
  await expect(page.locator(".muscle-body-view")).toHaveCount(2);
  await expect(page.locator(".exercise-instructions")).toContainText(
    "Lower the weight",
  );
  await expect(page.locator(".exercise-history-list")).toContainText("60 кг");
  await expect(page.locator(".exercise-history-list")).toContainText(
    "Выполнен",
  );
  await page.screenshot({
    path: testInfo.outputPath("exercise-details.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator(".exercise-details h1")).toHaveText(
    "Barbell Bench Press",
  );
});

test("body weight graph updates from profile and filters periods", async ({
  page,
}) => {
  await mockAPI(page);
  await page.goto("/");
  await expect(page.locator(".body-weight-panel .trend-plot")).toHaveAttribute(
    "aria-label",
    /75.5 кг/,
  );
  await page.locator(".body-weight-panel select").selectOption("week");
  await expect(page.locator(".body-weight-panel .trend-empty")).toBeVisible();
  await page.goto("/#/profile");
  await page.getByLabel("Вес, кг").fill("74.25");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await page.goto("/#/home");
  await expect(page.locator(".body-weight-panel .trend-plot")).toHaveAttribute(
    "aria-label",
    /74.25 кг/,
  );
});

test("swipe deletes only selected set, cancel is safe, fallback supports keyboard", async ({
  page,
}, testInfo) => {
  const state = await mockAPI(page);
  await startWithExercise(page);
  await page
    .locator(".add-set-form")
    .getByLabel("Вес, кг", { exact: true })
    .fill("60");
  await page
    .getByRole("button", { name: "Добавить подход", exact: true })
    .click();
  const surface = page.locator(".set-swipe > [data-swipe]");
  await surface.scrollIntoViewIfNeeded();
  const box = (await surface.boundingBox())!;
  const x = box.x + box.width - 20,
    y = box.y + box.height - 5;
  // Pointer events exercise the same nested-row gesture handler as touch.
  // Native mouse movement supplies pointer capture and a physical drag on desktop.
  if (testInfo.project.name === "desktop") {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 80, y, { steps: 10 });
    await page.mouse.up();
  } else {
    // Actual Chromium touch input also checks that vertical scrolling isn't hijacked.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (const dx of [20, 40, 65, 85])
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x - dx, y }],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  }
  await expect(
    page.getByRole("button", { name: "Удалить подход", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", {
      name: "Действия: Barbell Bench Press",
      exact: true,
    }),
  ).toHaveAttribute("aria-expanded", "false");
  await page
    .getByRole("button", { name: "Удалить подход", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Отмена" })
    .click();
  await expect(page.locator(".set-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Удалить подход", exact: true })
    .click();
  state.failDelete = true;
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Удалить", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Не удалось удалить");
  await expect(page.locator(".set-row")).toHaveCount(1);
  state.failDelete = false;
  await page
    .getByRole("button", { name: "Удалить подход", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Удалить", exact: true })
    .click();
  await expect(page.locator(".set-row")).toHaveCount(0);
  const actions = page.getByRole("button", {
    name: "Действия: Barbell Bench Press",
    exact: true,
  });
  await actions.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", {
      name: "Удалить Barbell Bench Press",
      exact: true,
    }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Удалить", exact: true })
    .click();
  await expect(page.locator(".workout-exercise-card")).toHaveCount(0);
});

test("network retry keeps token, authenticated 401 returns to login", async ({
  page,
}) => {
  const state = await mockAPI(page);
  state.offline = true;
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Нет связи с сервером");
  expect(await page.evaluate(() => localStorage.getItem("access_token"))).toBe(
    "ui-test-token",
  );
  state.offline = false;
  await page.getByRole("button", { name: "Попробовать снова" }).click();
  await expect(
    page.getByRole("heading", { name: "Привет, nurzhan." }),
  ).toBeVisible();
  state.unauthorized = true;
  await page
    .getByRole("button", { name: "Начать тренировку", exact: true })
    .click();
  await expect(
    page.getByText("Сессия истекла. Войди снова — тренировки сохранены."),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("access_token")),
  ).toBeNull();
});

test("smallest screen: forms and modal fit", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  const state = await mockAPI(page);
  state.profile.nickname = "a".repeat(50);
  await page.goto("/");
  await noOverflow(page);
  await page.getByRole("link", { name: "Открыть профиль" }).click();
  await noOverflow(page);
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await noOverflow(page);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Выйти", exact: true })
    .click();
  await page.getByRole("button", { name: "Регистрация", exact: true }).click();
  await noOverflow(page);
});

test("bodyweight sets, reload persistence and editor fit at narrow/tablet sizes", async ({
  page,
}, testInfo) => {
  await mockAPI(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Начать тренировку", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Добавить упражнение", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Добавить Pull-Ups", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Закрыть каталог", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Добавить подход", exact: true })
    .click();
  await expect(page.locator(".set-row")).toHaveCount(1);
  await expect(page.locator(".set-row").getByLabel("Доп. вес, кг")).toHaveValue(
    "",
  );
  await page.reload();
  await expect(page.locator(".set-row")).toHaveCount(1);
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
    for (const field of await page
      .locator(".set-row input[type=number]")
      .all()) {
      const box = (await field.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(45);
      expect(box.x + box.width).toBeLessThan(width);
    }
  }
  await page.screenshot({
    path: testInfo.outputPath("tablet-workout.png"),
    fullPage: true,
  });
});
