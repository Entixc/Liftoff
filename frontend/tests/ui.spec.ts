import { test, expect } from "@playwright/test";
import { mockAPI, noOverflow, startWithExercise } from "./fixtures";

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
  await page.getByLabel("Окончание", { exact: true }).fill("2026-10-10T09:00");
  await page.getByRole("button", { name: "Сохранить время" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Начало должно быть раньше",
  );
  await page.getByLabel("Окончание", { exact: true }).fill("2026-10-10T11:00");
  await page.getByRole("button", { name: "Сохранить время" }).click();
  await expect(page.getByText("Время тренировки обновлено")).toBeVisible();
  expect(
    Date.parse(state.history[0].finished_at!) -
      Date.parse(state.history[0].started_at),
  ).toBe(3600000);
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await expect(page.locator(".read-set")).toBeVisible();
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
