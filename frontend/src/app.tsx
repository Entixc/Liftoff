import { useEffect, useState } from "react";
import { getMyProfile, type TokenResponse, type UserProfile } from "./api/auth";
import { getExercises, type Exercise } from "./api/exercises";
import {
  getActiveWorkout,
  getWorkoutExercises,
  getWorkoutHistory,
  startWorkout,
  type Workout,
} from "./api/workouts";
import { errorMessage } from "./api/http";
import { AppShell, Brand, pages, type Page } from "./components/AppShell";
import { ActiveWorkout, WorkoutTimer } from "./components/ActiveWorkout";
import { ExerciseCatalog } from "./components/ExerciseCatalog";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";
import { ProfileForm } from "./components/ProfileForm";
import { WorkoutHistory } from "./components/WorkoutHistory";
import { WorkoutHistoryDetails } from "./components/WorkoutHistoryDetails";
import {
  Badge,
  Button,
  ErrorState,
  Icon,
  LoadingState,
  PageHeader,
  Panel,
  UIProvider,
  useUI,
} from "./components/ui";
import { formatDate } from "./lib/format";

function useRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, "") || "home";
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const update = () => setRoute(read());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const rawPage = route.split("/")[0];
  const page: Page = pages.some((p) => p.id === rawPage)
    ? (rawPage as Page)
    : "home";
  return {
    page,
    detailId: page === "history" ? Number(route.split("/")[1]) || null : null,
  };
}
function navigate(page: Page, id?: number) {
  window.location.hash = `/${page}${id ? `/${id}` : ""}`;
}
function AuthScreen({
  onLogin,
  message,
}: {
  onLogin: (response: TokenResponse) => void;
  message: string | null;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [registered, setRegistered] = useState(false);
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Brand />
        <div className="auth-story-copy">
          <p className="eyebrow">ТВОЯ СИЛА. ТВОЙ РИТМ.</p>
          <h2>
            Большие перемены.
            <br />
            <em>Один подход</em>
            <br />
            за раз.
          </h2>
          <p>
            Твой личный дневник тренировок.
            <br />
            Записывай, возвращайся, продолжай.
          </p>
        </div>
        <div className="orbit-art" aria-hidden="true">
          <div />
          <div />
          <div />
          <span>
            <Icon name="workout" size={80} />
          </span>
        </div>
        <p className="auth-story-footer">
          <span className="status-dot" />
          Место, где твои усилия становятся историей.
        </p>
      </section>
      <main className="auth-main">
        <a href="#/home" className="mobile-auth-brand brand-link">
          <Brand />
        </a>
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              onClick={() => setMode("login")}
              aria-pressed={mode === "login"}
            >
              Вход
            </button>
            <button
              onClick={() => setMode("register")}
              aria-pressed={mode === "register"}
            >
              Регистрация
            </button>
          </div>
          {message && (
            <p role="status" className="session-message">
              {message}
            </p>
          )}
          {registered && mode === "login" && (
            <p role="status" className="success-message">
              Аккаунт создан. Теперь можно войти.
            </p>
          )}
          {mode === "login" ? (
            <LoginForm
              key={nickname}
              initialNickname={nickname}
              onLogin={onLogin}
              onShowRegistration={() => setMode("register")}
            />
          ) : (
            <RegisterForm
              onShowLogin={() => setMode("login")}
              onRegistered={(name) => {
                setNickname(name);
                setRegistered(true);
                setMode("login");
              }}
            />
          )}
          <p className="auth-footnote">Меньше отвлечений. Больше движения.</p>
        </div>
      </main>
    </div>
  );
}
function SessionApp({ token, logout }: { token: string; logout: () => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [active, setActive] = useState<Workout | null>(null);
  const [history, setHistory] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const { page, detailId } = useRoute();
  const { notify, confirm } = useUI();
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getMyProfile(token),
      getExercises(),
      getActiveWorkout(token),
      getWorkoutHistory(token),
    ])
      .then(([user, catalog, workout, records]) => {
        if (!cancelled) {
          setProfile(user);
          setExercises(catalog);
          setActive(workout);
          setHistory(records);
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            errorMessage(
              e,
              "Не удалось загрузить приложение. Проверь, что сервер доступен.",
            ),
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, reload]);
  useEffect(() => {
    let cancelled = false;
    setActiveCount(null);
    if (active && page === "home")
      getWorkoutExercises(token, active.id)
        .then((items) => {
          if (!cancelled) setActiveCount(items.length);
        })
        .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active, page, token]);
  async function start() {
    if (active) {
      navigate("workout");
      return;
    }
    setStarting(true);
    setStartError(null);
    try {
      setActive(await startWorkout(token));
      navigate("workout");
      notify("Тренировка началась");
    } catch (e) {
      setStartError(
        errorMessage(
          e,
          "Не удалось начать тренировку. Возможно, она уже начата в другой вкладке.",
        ),
      );
    } finally {
      setStarting(false);
    }
  }
  function updateHistory(workout: Workout) {
    setHistory((current) =>
      [workout, ...current.filter((item) => item.id !== workout.id)].sort(
        (a, b) =>
          Date.parse(b.finished_at ?? "") - Date.parse(a.finished_at ?? "") ||
          b.id - a.id,
      ),
    );
  }
  async function signOut() {
    if (
      await confirm({
        title: "Выйти из аккаунта?",
        message:
          "Сохранённые данные останутся в твоём профиле. Активная тренировка продолжится после следующего входа.",
        label: "Выйти",
      })
    )
      logout();
  }
  if (loading || !profile)
    return (
      <main className="bootstrap-screen">
        <Brand />
        {error ? (
          <>
            <ErrorState message={error} retry={() => setReload((n) => n + 1)} />
            <Button onClick={logout}>Вернуться ко входу</Button>
          </>
        ) : (
          <LoadingState />
        )}
      </main>
    );
  const selectedWorkout = history.find((item) => item.id === detailId);
  return (
    <AppShell
      page={page}
      detailId={detailId}
      profile={profile}
      active={Boolean(active)}
      onLogout={() => void signOut()}
    >
      {error && (
        <ErrorState message={error} retry={() => setReload((n) => n + 1)} />
      )}
      {startError && (
        <ErrorState
          message={startError}
          retry={() => {
            setStartError(null);
            setReload((n) => n + 1);
          }}
        />
      )}
      {page === "home" && (
        <>
          <PageHeader
            eyebrow={new Intl.DateTimeFormat("ru-RU", {
              day: "numeric",
              month: "long",
              weekday: "long",
            }).format(new Date())}
            title={`Привет, ${profile.nickname}.`}
            description="Хороший день, чтобы стать немного сильнее."
          />
          <section className="hero-panel">
            <div className="hero-copy">
              <Badge active={Boolean(active)}>
                {active ? "Тренировка идёт" : "ТВОЁ ВРЕМЯ ДЛЯ СЕБЯ"}
              </Badge>
              <h2>
                {active ? (
                  <>
                    Держи свой
                    <br />
                    ритм.
                  </>
                ) : (
                  <>
                    Следующий подход.
                    <br />
                    <span>Следующая версия тебя.</span>
                  </>
                )}
              </h2>
              <p>
                {active
                  ? `${activeCount === null ? "Упражнения сохранены." : `Упражнений в тренировке: ${activeCount}.`} Продолжай там, где остановился.`
                  : "Начни тренировку. Запиши свои усилия. Увидь, как далеко ты продвинулся."}
              </p>
              <Button
                variant="primary"
                onClick={() => void start()}
                disabled={starting}
              >
                <Icon name={active ? "arrow" : "plus"} />
                {starting
                  ? "Начинаем…"
                  : active
                    ? "Продолжить тренировку"
                    : "Начать тренировку"}
              </Button>
            </div>
            <div className="hero-art" aria-hidden={!active}>
              {active ? (
                <div className="hero-live-timer">
                  <WorkoutTimer startedAt={active.started_at} />
                  <span>В твоём темпе</span>
                </div>
              ) : (
                <>
                  <div className="hero-ring ring-one" />
                  <div className="hero-ring ring-two" />
                  <div className="hero-ring ring-three" />
                  <Icon name="workout" size={94} />
                  <span className="hero-art-label">ONE MORE REP.</span>
                </>
              )}
            </div>
          </section>
          <div className="dashboard-grid">
            <Panel>
              <div className="section-heading">
                <h2>Последние тренировки</h2>
                <a className="text-link" href="#/history">
                  Вся история
                  <Icon name="arrow" size={16} />
                </a>
              </div>
              <WorkoutHistory
                compact
                workouts={history.slice(0, 3)}
                onOpen={(item) => navigate("history", item.id)}
                onStart={() => navigate("workout")}
              />
            </Panel>
            <div className="dashboard-side">
              <Panel>
                <div className="section-heading">
                  <h2>Твой профиль</h2>
                  <a
                    href="#/profile"
                    className="icon-button"
                    aria-label="Редактировать профиль"
                  >
                    <Icon name="edit" size={18} />
                  </a>
                </div>
                <div className="profile-metrics">
                  <div>
                    <span>Рост</span>
                    <strong>
                      {profile.height_cm ?? "—"}
                      <small> см</small>
                    </strong>
                  </div>
                  <div>
                    <span>Вес</span>
                    <strong>
                      {profile.body_weight_kg
                        ? Number(profile.body_weight_kg)
                        : "—"}
                      <small> кг</small>
                    </strong>
                  </div>
                </div>
                <p className="field-hint">
                  Твоя отправная точка. Обновляй по мере изменений.
                </p>
              </Panel>
              <a href="#/catalog" className="catalog-shortcut">
                <span className="exercise-icon">
                  <Icon name="catalog" />
                </span>
                <span>
                  <strong>Найди своё упражнение</strong>
                  <span className="muted">
                    {exercises.length} упражнений в каталоге
                  </span>
                </span>
                <Icon name="arrow" />
              </a>
            </div>
          </div>
          <div className="quick-actions">
            <a href="#/workout">
              <Icon name="workout" />
              {active ? "Продолжить тренировку" : "К тренировке"}
              <Icon name="arrow" size={16} />
            </a>
            <a href="#/history">
              <Icon name="history" />
              Моя история
              <Icon name="arrow" size={16} />
            </a>
            <a href="#/catalog">
              <Icon name="catalog" />
              Каталог упражнений
              <Icon name="arrow" size={16} />
            </a>
          </div>
        </>
      )}
      {page === "workout" && (
        <>
          <PageHeader
            eyebrow="ФОКУС НА ДВИЖЕНИИ"
            title="Твоя тренировка"
            description="Один подход за другим. Всё остальное подождёт."
          />
          <ActiveWorkout
            key={active?.id ?? "empty"}
            workout={active}
            exercises={exercises}
            token={token}
            onStart={() => void start()}
            starting={starting}
            onWorkoutCompleted={(workout) => {
              setActive(null);
              updateHistory(workout);
              navigate("history", workout.id);
            }}
          />
        </>
      )}
      {page === "history" &&
        (detailId ? (
          selectedWorkout ? (
            <WorkoutHistoryDetails
              key={selectedWorkout.id}
              workout={selectedWorkout}
              exercises={exercises}
              token={token}
              onClose={() => navigate("history")}
              onWorkoutUpdated={updateHistory}
            />
          ) : (
            <ErrorState
              message="Тренировка не найдена в твоей истории."
              retry={() => navigate("history")}
            />
          )
        ) : (
          <>
            <PageHeader
              eyebrow="КАЖДЫЙ ПОДХОД ИМЕЕТ ЗНАЧЕНИЕ"
              title="История тренировок"
              description="Возвращайся к результатам. Продолжай свой путь."
              action={<Badge>Завершено: {history.length}</Badge>}
            />
            <Panel>
              <WorkoutHistory
                workouts={history}
                onOpen={(item) => navigate("history", item.id)}
                onStart={() => navigate("workout")}
              />
            </Panel>
          </>
        ))}
      {page === "catalog" && (
        <>
          <PageHeader
            eyebrow="ТВОЯ БАЗА ДВИЖЕНИЙ"
            title="Упражнения"
            description="Найди упражнения для своей следующей тренировки."
          />
          <ExerciseCatalog exercises={exercises} />
        </>
      )}
      {page === "profile" && (
        <>
          <PageHeader
            eyebrow="ТВОЁ ПРОСТРАНСТВО"
            title="Профиль"
            description="Немного о тебе. Всё для твоих тренировок."
          />
          <div className="profile-layout">
            <Panel className="profile-identity">
              <span className="avatar avatar-large">
                {profile.nickname.slice(0, 1).toUpperCase()}
              </span>
              <h2>{profile.nickname}</h2>
              <Badge>Участник Liftoff</Badge>
              <div className="profile-divider" />
              <span className="muted">С нами с</span>
              <strong>{formatDate(profile.created_at)}</strong>
              <p className="field-hint">
                Твои тренировки доступны только тебе.
              </p>
            </Panel>
            <div className="profile-settings">
              <ProfileForm
                profile={profile}
                token={token}
                onProfileUpdated={setProfile}
              />
              <Panel>
                <div className="section-heading">
                  <div>
                    <h2>Твой аккаунт</h2>
                    <p className="muted">
                      Выход завершит сессию на этом устройстве.
                    </p>
                  </div>
                  <Button onClick={() => void signOut()}>
                    <Icon name="logout" />
                    Выйти
                  </Button>
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
function AppContent() {
  const [token, setToken] = useState(() =>
    localStorage.getItem("access_token"),
  );
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    function expired(event: Event) {
      if ((event as CustomEvent<string>).detail !== token) return;
      localStorage.removeItem("access_token");
      setToken(null);
      setMessage("Сессия истекла. Войди снова — тренировки сохранены.");
    }
    function sync(event: StorageEvent) {
      if (event.key === "access_token") {
        setToken(event.newValue);
        setMessage(null);
      }
    }
    window.addEventListener("session-expired", expired);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("session-expired", expired);
      window.removeEventListener("storage", sync);
    };
  }, [token]);
  return token ? (
    <SessionApp
      key={token}
      token={token}
      logout={() => {
        localStorage.removeItem("access_token");
        setToken(null);
        setMessage(null);
        navigate("home");
      }}
    />
  ) : (
    <AuthScreen
      message={message}
      onLogin={(response) => {
        localStorage.setItem("access_token", response.access_token);
        setToken(response.access_token);
        setMessage(null);
      }}
    />
  );
}
export function App() {
  return (
    <UIProvider>
      <AppContent />
    </UIProvider>
  );
}
