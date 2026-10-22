import { useEffect, useState } from "react";
import {
  getBodyWeightHistory,
  getMyProfile,
  logoutSession,
  restoreSession,
  type BodyWeightEntry,
  type UserProfile,
} from "./api/auth";
import { getExercises, type Exercise } from "./api/exercises";
import { getRoutines, startRoutine, type Routine } from "./api/routines";
import {
  getActiveWorkout,
  getWorkoutExercises,
  getWorkoutHistory,
  getWorkoutProgress,
  startWorkout,
  type ProgressSet,
  type Workout,
} from "./api/workouts";
import { ApiError, errorMessage } from "./api/http";
import { AppShell, Brand, pages, type Page } from "./components/AppShell";
import { ActiveWorkout, WorkoutTimer } from "./components/ActiveWorkout";
import { ExerciseCatalog } from "./components/ExerciseCatalog";
import { ExerciseDetails } from "./components/ExerciseDetails";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";
import { Routines } from "./components/Routines";
import { ProfileForm } from "./components/ProfileForm";
import { WorkoutHistory } from "./components/WorkoutHistory";
import { WorkoutHistoryDetails } from "./components/WorkoutHistoryDetails";
import { ProgressAnalytics } from "./components/ProgressAnalytics";
import { BodyWeightTrend } from "./components/BodyWeightTrend";
import { ChangePasswordForm } from "./components/ChangePasswordForm";
import { EmailVerificationPanel } from "./components/EmailVerificationPanel";
import { EmailVerificationScreen } from "./components/EmailVerificationScreen";
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
    catalogId: page === "catalog" ? Number(route.split("/")[1]) || null : null,
  };
}
function navigate(page: Page, id?: number) {
  window.location.hash = `/${page}${id ? `/${id}` : ""}`;
}

function useEmailVerificationToken() {
  const read = () => {
    const [path, query = ""] = window.location.hash.split("?", 2);
    if (path !== "#/verify-email") return null;
    return new URLSearchParams(query).get("token") ?? "";
  };
  const [token, setToken] = useState<string | null>(read);
  useEffect(() => {
    const update = () => setToken(read());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return token;
}
function AuthScreen({
  onLogin,
  message,
}: {
  onLogin: () => void;
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
              Аккаунт создан. Проверь email (локально — терминал backend) и
              войди.
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
function SessionApp({ logout }: { logout: () => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [active, setActive] = useState<Workout | null>(null);
  const [history, setHistory] = useState<Workout[]>([]);
  const [progress, setProgress] = useState<ProgressSet[]>([]);
  const [bodyWeightHistory, setBodyWeightHistory] = useState<BodyWeightEntry[]>(
    [],
  );
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const { page, detailId, catalogId } = useRoute();
  const { notify, confirm } = useUI();
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getMyProfile(),
      getExercises(),
      getActiveWorkout(),
      getWorkoutHistory(),
      getWorkoutProgress(),
      getBodyWeightHistory(),
      getRoutines(),
    ])
      .then(
        ([
          user,
          catalog,
          workout,
          records,
          progressSets,
          weightEntries,
          savedRoutines,
        ]) => {
          if (!cancelled) {
            setProfile(user);
            setExercises(catalog);
            setActive(workout);
            setHistory(records);
            setProgress(progressSets);
            setBodyWeightHistory(weightEntries);
            setRoutines(savedRoutines);
          }
        },
      )
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
  }, [reload]);
  useEffect(() => {
    let cancelled = false;
    setActiveCount(null);
    if (active && page === "home")
      getWorkoutExercises(active.id)
        .then((items) => {
          if (!cancelled) setActiveCount(items.length);
        })
        .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active, page]);
  async function start() {
    if (active) {
      navigate("workout");
      return;
    }
    setStarting(true);
    setStartError(null);
    try {
      setActive(await startWorkout());
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
    void getWorkoutProgress()
      .then(setProgress)
      .catch(() => {});
  }
  function updateRoutine(routine: Routine) {
    setRoutines((current) => [
      routine,
      ...current.filter((item) => item.id !== routine.id),
    ]);
  }
  async function launchRoutine(id: number) {
    const workout = await startRoutine(id);
    setActive(workout);
    navigate("workout");
    notify("Тренировка по рутине началась");
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
      detailId={detailId ?? catalogId}
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
          <ProgressAnalytics
            history={history}
            sets={progress}
            exercises={exercises}
          />
          <BodyWeightTrend entries={bodyWeightHistory} />
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
            <a href="#/routines">
              <Icon name="routine" />
              Мои рутины
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
            onStart={() => void start()}
            starting={starting}
            onWorkoutCompleted={(workout) => {
              setActive(null);
              updateHistory(workout);
              navigate("history", workout.id);
            }}
            onWorkoutCancelled={() => setActive(null)}
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
              onClose={() => {
                navigate("history");
                setReload((value) => value + 1);
              }}
              onWorkoutUpdated={updateHistory}
              onRoutineSaved={updateRoutine}
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
            <ProgressAnalytics
              history={history}
              sets={progress}
              exercises={exercises}
            />
          </>
        ))}
      {page === "routines" && (
        <>
          <PageHeader
            eyebrow="ТВОЙ ПЛАН"
            title="Рутины"
            description="Любимый набор упражнений всегда под рукой."
            action={<Badge>Всего: {routines.length}</Badge>}
          />
          <Routines
            routines={routines}
            exercises={exercises}
            active={Boolean(active)}
            onSaved={updateRoutine}
            onDeleted={(id) =>
              setRoutines((current) => current.filter((item) => item.id !== id))
            }
            onStart={launchRoutine}
          />
        </>
      )}
      {page === "catalog" &&
        (catalogId ? (
          <ExerciseDetails
            key={catalogId}
            exerciseId={catalogId}
            onBack={() => navigate("catalog")}
          />
        ) : (
          <>
            <PageHeader
              eyebrow="ТВОЯ БАЗА ДВИЖЕНИЙ"
              title="Упражнения"
              description="Найди упражнения для своей следующей тренировки."
            />
            <ExerciseCatalog
              exercises={exercises}
              onOpen={(exercise) => navigate("catalog", exercise.id)}
            />
          </>
        ))}
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
              <p className="muted">{profile.email}</p>
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
                onProfileUpdated={(updated) => {
                  setProfile(updated);
                  void getBodyWeightHistory()
                    .then(setBodyWeightHistory)
                    .catch(() => {});
                }}
              />
              <EmailVerificationPanel profile={profile} />
              <ChangePasswordForm />
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
  const verificationToken = useEmailVerificationToken();
  const [session, setSession] = useState<
    "checking" | "authenticated" | null
  >("checking");
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    localStorage.removeItem("access_token");
    void restoreSession()
      .then((authenticated) =>
        setSession(authenticated ? "authenticated" : null),
      )
      .catch((error: unknown) => {
        setSession(
          error instanceof ApiError && error.status === 401
            ? null
            : "authenticated",
        );
      });
    function expired() {
      setSession(null);
      setMessage("Сессия истекла. Войди снова — тренировки сохранены.");
    }
    window.addEventListener("session-expired", expired);
    return () => {
      window.removeEventListener("session-expired", expired);
    };
  }, []);
  if (verificationToken !== null) {
    return (
      <EmailVerificationScreen
        token={verificationToken}
        onContinue={() => {
          window.location.hash = "/home";
        }}
      />
    );
  }
  return session === "checking" ? (
    <LoadingState />
  ) : session ? (
    <SessionApp
      logout={() => {
        void logoutSession()
          .then(() => {
            setSession(null);
            setMessage(null);
            navigate("home");
          })
          .catch(() =>
            window.alert("Не удалось завершить сессию. Попробуй ещё раз."),
          );
      }}
    />
  ) : (
    <AuthScreen
      message={message}
      onLogin={() => {
        setSession("authenticated");
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
