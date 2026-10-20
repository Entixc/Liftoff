# Workout Tracker

Веб-приложение для ведения дневника силовых и домашних тренировок.

Пользователь запускает тренировку, добавляет упражнения и подходы, затем сохраняет результат в истории. Полные требования MVP описаны в [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md), а существенные технические решения — в [docs/DECISIONS.md](docs/DECISIONS.md).

## Стек

- Backend: Python, FastAPI, SQLAlchemy, Alembic, PostgreSQL
- Frontend: React, TypeScript, Vite
- Инфраструктура: Docker Compose и GitHub Actions

## Текущий статус

Готовы регистрация, вход, защищённый профиль, начальный каталог упражнений и активная тренировка. `POST /auth/register` создаёт пользователя, `POST /auth/login` возвращает JWT access token, `GET` и `PATCH /auth/me` читают и изменяют профиль владельца валидного Bearer-токена, а `GET /exercises` возвращает каталог. Защищённые маршруты тренировок создают и восстанавливают единственную активную тренировку, добавляют упражнения и возвращают их в заданном порядке. Frontend сохраняет токен, позволяет просматривать и изменять профиль, начать или восстановить тренировку с таймером, выбрать упражнения из каталога и увидеть текущий состав после перезагрузки страницы. Критичные backend-сценарии покрыты интеграционными тестами.

## Локальный запуск без Docker

Для backend нужны Python, PostgreSQL и переменная окружения `DATABASE_URL`.

```bash
cd /d/liftoff/backend
source ../.venv/Scripts/activate
export DATABASE_URL='postgresql+psycopg://workout_tracker:ПАРОЛЬ@localhost:5432/workout_tracker'
export JWT_SECRET_KEY='СЮДА_СЛУЧАЙНЫЙ_СЕКРЕТ_НЕ_МЕНЕЕ_32_СИМВОЛОВ'
python -m alembic upgrade head
python -m app.main
```

Если в пароле есть специальные символы, их нужно URL-кодировать: например, `@` заменяется на `%40`. Создать секрет для JWT можно командой `python -c "import secrets; print(secrets.token_urlsafe(32))"`. Не сохраняйте `DATABASE_URL` или `JWT_SECRET_KEY` в файлах, которые попадут в Git.

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
export JWT_SECRET_KEY='СЮДА_СЛУЧАЙНЫЙ_СЕКРЕТ_НЕ_МЕНЕЕ_32_СИМВОЛОВ'
python -m pytest tests
```
