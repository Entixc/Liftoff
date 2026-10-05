# Workout Tracker

Веб-приложение для ведения дневника силовых и домашних тренировок.

Пользователь запускает тренировку, добавляет упражнения и подходы, затем сохраняет результат в истории. Полные требования MVP описаны в [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md), а существенные технические решения — в [docs/DECISIONS.md](docs/DECISIONS.md).

## Стек

- Backend: Python, FastAPI, SQLAlchemy, Alembic, PostgreSQL
- Frontend: React, TypeScript, Vite
- Инфраструктура: Docker Compose и GitHub Actions

## Текущий статус

Готова базовая инфраструктура backend: health-check, подключение к PostgreSQL, миграция таблицы `users`, фабрика SQLAlchemy-сессий и валидация данных регистрации. Реализация API регистрации находится в работе.

## Локальный запуск без Docker

Для backend нужны Python, PostgreSQL и переменная окружения `DATABASE_URL`.

```bash
cd /d/liftoff/backend
source ../.venv/Scripts/activate
export DATABASE_URL='postgresql+psycopg://workout_tracker:ПАРОЛЬ@localhost:5432/workout_tracker'
python -m alembic upgrade head
python -m app.main
```

Если в пароле есть специальные символы, их нужно URL-кодировать: например, `@` заменяется на `%40`. Не сохраняйте `DATABASE_URL` с паролем в файлах, которые попадут в Git.

В другом терминале запустите frontend:

```bash
cd /d/liftoff/frontend
npm install
npm run dev
```

Frontend обычно доступен по адресу `http://localhost:5173`, backend — по адресу `http://localhost:8000`, а документация API — `http://localhost:8000/docs`.

## Проверка backend

```bash
cd /d/liftoff/backend
source ../.venv/Scripts/activate
export DATABASE_URL='postgresql+psycopg://workout_tracker:ПАРОЛЬ@localhost:5432/workout_tracker'
python -m pytest tests
```
