import { type FormEvent, useState } from "react";

import { login, type TokenResponse } from "../api/auth";

type LoginFormProps = {
  onLogin: (tokenResponse: TokenResponse) => void;
  onShowRegistration: () => void;
  initialNickname?: string;
};

export function LoginForm({
  onLogin,
  onShowRegistration,
  initialNickname = "",
}: LoginFormProps) {
  const [nickname, setNickname] = useState(initialNickname);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);

    try {
      const tokenResponse = await login({ nickname, password });
      onLogin(tokenResponse);
    } catch {
      setError("Не удалось войти. Проверь никнейм и пароль.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Вход</h2>

      <label>
        Никнейм
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          required
        />
      </label>

      <label>
        Пароль
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error && <p>{error}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Входим..." : "Войти"}
      </button>

      <button type="button" onClick={onShowRegistration}>
        Создать аккаунт
      </button>
    </form>
  );
}
