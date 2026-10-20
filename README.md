# Workout Tracker

Веб-приложение для ведения дневника силовых и домашних тренировок.

Пользователь запускает тренировку, добавляет упражнения и подходы, затем сохраняет результат в истории. Полные требования MVP описаны в [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md), а существенные технические решения — в [docs/DECISIONS.md](docs/DECISIONS.md).

## Стек

- Backend: Python, FastAPI, SQLAlchemy, Alembic, PostgreSQL
- Frontend: React, TypeScript, Vite
- Инфраструктура: Docker Compose

## Текущий статус

Готовы регистрация, вход, защищённый профиль, начальный каталог упражнений и полный цикл тренировки. Пользователь может вести активную тренировку, управлять упражнениями и подходами, завершить её, открыть в истории и отредактировать. Критичные backend-сценарии покрыты интеграционными тестами.

## Конфигурация

Скопируйте шаблон окружения, замените значения `CHANGE_ME` и укажите собственный `JWT_SECRET_KEY`:

```bash
cd /d/liftoff
cp .env.example .env
```

Для JWT создайте случайный секрет:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Настоящий `.env` игнорируется Git и не должен попадать в репозиторий. Если пароль PostgreSQL содержит специальные символы, в URL подключения их нужно кодировать: например, `@` заменяется на `%40`.

## Локальный запуск без Docker

Для backend нужны Python 3.14 и запущенный PostgreSQL. В Git Bash загрузите переменные из созданного `.env` и запустите приложение:

```bash
cd /d/liftoff
set -a
source .env
set +a

source .venv/Scripts/activate
cd backend
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m app.scripts.seed_exercises
python -m app.main
```

В другом Git Bash терминале загрузите то же окружение и запустите frontend:

```bash
cd /d/liftoff
set -a
source .env
set +a

cd frontend
npm install
npm run dev
```

Frontend обычно доступен по адресу `http://localhost:5173`, backend — по адресу `http://localhost:8000`, а документация API — `http://localhost:8000/docs`.

## Запуск через Docker Compose

После создания `.env` убедитесь, что `POSTGRES_PASSWORD` совпадает с паролем внутри `DOCKER_DATABASE_URL`, а адрес базы в этом URL использует хост `db`. Затем выполните:

```bash
docker compose up --build
```

Compose поднимет PostgreSQL, применит миграции, заполнит каталог упражнений и запустит backend и frontend.

## Проверка проекта

Backend:

```bash
cd /d/liftoff
set -a
source .env
set +a

source .venv/Scripts/activate
cd backend
python -m pytest tests
```

Frontend:

```bash
cd /d/liftoff/frontend
npm run build
```
