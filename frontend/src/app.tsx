import { useEffect, useState } from "react";

import {
  getMyProfile,
  type TokenResponse,
  type UserProfile,
} from "./api/auth";
import { getExercises, type Exercise } from "./api/exercises";
import { getActiveWorkout, type Workout } from "./api/workouts";
import { ActiveWorkout } from "./components/ActiveWorkout";
import { ExerciseCatalog } from "./components/ExerciseCatalog";
import { LoginForm } from "./components/LoginForm";
import { ProfileForm } from "./components/ProfileForm";
import { RegisterForm } from "./components/RegisterForm";
import { WorkoutHistory } from "./components/WorkoutHistory";

type AuthMode = "login" | "register";

export function App() {
  const [token, setToken] = useState(() =>
    localStorage.getItem("access_token"),
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [registeredNickname, setRegisteredNickname] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [exercisesError, setExercisesError] = useState<string | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(false);
  const [workoutError, setWorkoutError] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }

    const accessToken = token;

    async function loadProfile() {
      setIsLoadingProfile(true);
      setProfileError(null);

      try {
        const loadedProfile = await getMyProfile(accessToken);
        setProfile(loadedProfile);
      } catch {
        localStorage.removeItem("access_token");
        setToken(null);
        setProfileError("Сессия истекла. Войди снова.");
      } finally {
        setIsLoadingProfile(false);
      }
    }

    void loadProfile();
  }, [token]);

  useEffect(() => {
    async function loadExercises() {
      setIsLoadingExercises(true);
      setExercisesError(null);

      try {
        const loadedExercises = await getExercises();
        setExercises(loadedExercises);
      } catch {
        setExercisesError("Не удалось загрузить каталог упражнений.");
      } finally {
        setIsLoadingExercises(false);
      }
    }

    void loadExercises();
  }, []);

  useEffect(() => {
    if (!token) {
      setActiveWorkout(null);
      return;
    }

    const accessToken = token;

    async function loadActiveWorkout() {
      setIsLoadingWorkout(true);
      setWorkoutError(null);

      try {
        const workout = await getActiveWorkout(accessToken);
        setActiveWorkout(workout);
      } catch {
        setWorkoutError("Не удалось загрузить текущую тренировку.");
      } finally {
        setIsLoadingWorkout(false);
      }
    }

    void loadActiveWorkout();
  }, [token]);

  function handleLogin(tokenResponse: TokenResponse) {
    localStorage.setItem("access_token", tokenResponse.access_token);
    setToken(tokenResponse.access_token);
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    setToken(null);
  }

  function showRegistration() {
    setAuthMessage(null);
    setAuthMode("register");
  }

  function showLogin() {
    setAuthMessage(null);
    setAuthMode("login");
  }

  function handleRegistered(nickname: string) {
    setRegisteredNickname(nickname);
    setAuthMode("login");
    setAuthMessage("Аккаунт создан. Теперь войди.");
  }

  function handleWorkoutCompleted() {
    setActiveWorkout(null);
    setHistoryVersion((currentVersion) => currentVersion + 1);
  }

  return (
    <main>
      <h1>Workout Tracker</h1>

      {profileError && <p>{profileError}</p>}

      {!token && (
        <section>
          {authMessage && <p>{authMessage}</p>}

          {authMode === "login" ? (
            <LoginForm
              onLogin={handleLogin}
              onShowRegistration={showRegistration}
              initialNickname={registeredNickname}
            />
          ) : (
            <RegisterForm
              onRegistered={handleRegistered}
              onShowLogin={showLogin}
            />
          )}
        </section>
      )}

      {token && isLoadingProfile && <p>Загружаем профиль...</p>}

      {token && profile && (
        <section>
          <h2>Привет, {profile.nickname}!</h2>
          <p>Рост: {profile.height_cm ?? "не указан"}</p>
          <p>Вес: {profile.body_weight_kg ?? "не указан"}</p>
          <ProfileForm
            profile={profile}
            token={token}
            onProfileUpdated={setProfile}
          />
          {isLoadingWorkout && <p>Загружаем тренировку...</p>}
          {workoutError && <p>{workoutError}</p>}
          {!isLoadingWorkout && !workoutError && (
            <ActiveWorkout
              workout={activeWorkout}
              exercises={exercises}
              token={token}
              onWorkoutStarted={setActiveWorkout}
              onWorkoutCompleted={handleWorkoutCompleted}
            />
          )}
          <WorkoutHistory
            token={token}
            refreshVersion={historyVersion}
          />
          <button type="button" onClick={handleLogout}>
            Выйти
          </button>

          {isLoadingExercises && <p>Загружаем каталог упражнений...</p>}
          {exercisesError && <p>{exercisesError}</p>}
          {exercises.length > 0 && (
            <ExerciseCatalog exercises={exercises} />
          )}
        </section>
      )}
    </main>
  );
}
