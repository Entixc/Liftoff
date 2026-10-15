import { type FormEvent, useState } from "react";

import { register } from "../api/auth";

type RegisterFormProps = {
  onRegistered: (nickname: string) => void;
  onShowLogin: () => void;
};

export function RegisterForm({
  onRegistered,
  onShowLogin,
}: RegisterFormProps) {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== passwordConfirmation) {
      setError("Пароли не совпадают.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ nickname, password });
      onRegistered(nickname);
    } catch {
      setError("Не удалось зарегистрироваться. Возможно, никнейм уже занят.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Регистрация</h2>

      <label>
        Никнейм
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          minLength={3}
          maxLength={50}
          required
        />
      </label>

      <label>
        Пароль
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          maxLength={128}
          required
        />
      </label>

      <label>
        Повтори пароль
        <input
          type="password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          minLength={8}
          maxLength={128}
          required
        />
      </label>

      {error && <p>{error}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Создаём аккаунт..." : "Зарегистрироваться"}
      </button>

      <button type="button" onClick={onShowLogin}>
        Уже есть аккаунт
      </button>
    </form>
  );
}
