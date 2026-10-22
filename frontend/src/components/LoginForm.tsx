import { type FormEvent, useState } from "react";
import { login } from "../api/auth";
import { ApiError, errorMessage } from "../api/http";
import { Button, Icon, Input, PasswordInput } from "./ui";

export function LoginForm({
  onLogin,
  onShowRegistration,
  initialNickname = "",
}: {
  onLogin: () => void;
  onShowRegistration: () => void;
  initialNickname?: string;
}) {
  const [nickname, setNickname] = useState(initialNickname);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login({ nickname, password });
      onLogin();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? "Неверный никнейм или пароль."
          : errorMessage(e),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="auth-form" onSubmit={submit}>
      <div>
        <p className="eyebrow">С возвращением</p>
        <h1>
          Твой следующий
          <br />
          шаг — здесь.
        </h1>
        <p className="muted">Войди, чтобы продолжить свою историю.</p>
      </div>
      <Input
        label="Никнейм"
        autoComplete="username"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        required
        minLength={3}
        maxLength={50}
        placeholder="Твой никнейм"
      />
      <PasswordInput
        label="Пароль"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        maxLength={128}
        placeholder="Введи пароль"
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Входим…" : "Войти"}
        <Icon name="arrow" />
      </Button>
      <p className="auth-switch">
        Первый раз здесь?{" "}
        <button
          type="button"
          onClick={onShowRegistration}
          className="text-button"
        >
          Создать аккаунт
        </button>
      </p>
    </form>
  );
}
