import { useEffect, useState } from "react";

import {
  getMyProfile,
  type TokenResponse,
  type UserProfile,
} from "./api/auth";
import { LoginForm } from "./components/LoginForm";
import { ProfileForm } from "./components/ProfileForm";

export function App() {
  const [token, setToken] = useState(() =>
    localStorage.getItem("access_token"),
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

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

  function handleLogin(tokenResponse: TokenResponse) {
    localStorage.setItem("access_token", tokenResponse.access_token);
    setToken(tokenResponse.access_token);
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    setToken(null);
  }

  return (
    <main>
      <h1>Workout Tracker</h1>

      {profileError && <p>{profileError}</p>}

      {!token && <LoginForm onLogin={handleLogin} />}

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
          <button type="button" onClick={handleLogout}>
            Выйти
          </button>
        </section>
      )}
    </main>
  );
}
