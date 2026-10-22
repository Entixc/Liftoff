import { type FormEvent, useState } from "react";
import { register } from "../api/auth";
import { ApiError, errorMessage } from "../api/http";
import { Button, Icon, Input, PasswordInput } from "./ui";

export function RegisterForm({
  onRegistered,
  onShowLogin,
}: {
  onRegistered: (name: string) => void;
  onShowLogin: () => void;
}) {
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== repeat) {
      setError("Пароли не совпадают.");
      return;
    }
    setBusy(true);
    try {
      await register({ nickname, email, password });
      onRegistered(nickname);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? "Этот никнейм или email уже используется."
          : errorMessage(e),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="auth-form" onSubmit={submit}>
      <div>
        <p className="eyebrow">Начало твоей истории</p>
        <h1>
          Каждая тренировка
          <br />
          имеет значение.
        </h1>
        <p className="muted">Создай аккаунт и сохрани первый результат.</p>
      </div>
      <Input
        label="Никнейм"
        autoComplete="username"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        minLength={3}
        maxLength={50}
        required
        placeholder="От 3 до 50 символов"
      />
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="you@example.com"
      />
      <PasswordInput
        label="Пароль"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        maxLength={128}
        required
        placeholder="Минимум 8 символов"
      />
      <PasswordInput
        label="Повтори пароль"
        autoComplete="new-password"
        value={repeat}
        onChange={(e) => setRepeat(e.target.value)}
        required
        placeholder="Ещё раз, чтобы не ошибиться"
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Создаём…" : "Создать аккаунт"}
        <Icon name="arrow" />
      </Button>
      <p className="auth-switch">
        Уже с нами?{" "}
        <button type="button" className="text-button" onClick={onShowLogin}>
          Войти
        </button>
      </p>
    </form>
  );
}
