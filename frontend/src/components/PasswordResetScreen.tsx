import { type FormEvent, useState } from "react";
import { resetPassword } from "../api/auth";
import { ApiError, errorMessage } from "../api/http";
import { Brand } from "./AppShell";
import { Button, Icon, Panel, PasswordInput } from "./ui";


export function PasswordResetScreen({
  token,
  onContinue,
}: {
  token: string;
  onContinue: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : "В ссылке отсутствует токен восстановления.",
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("Новые пароли не совпадают.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 400
          ? "Ссылка истекла, уже использована или пароль не изменился."
          : errorMessage(caught, "Не удалось изменить пароль."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="verification-layout">
      <Brand />
      <Panel className="verification-card">
        {success ? (
          <>
            <span className="verification-icon success">
              <Icon name="check" size={30} />
            </span>
            <p className="eyebrow">БЕЗОПАСНОСТЬ</p>
            <h1>Пароль изменён</h1>
            <p className="muted">
              Все прежние сессии завершены. Войди с новым паролем.
            </p>
            <Button variant="primary" onClick={onContinue}>
              Перейти ко входу
              <Icon name="arrow" />
            </Button>
          </>
        ) : (
          <form className="profile-form reset-password-form" onSubmit={submit}>
            <div>
              <p className="eyebrow">НОВЫЙ ПАРОЛЬ</p>
              <h1>Создай новый пароль.</h1>
            </div>
            <PasswordInput
              label="Новый пароль"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              required
              disabled={busy || !token}
            />
            <PasswordInput
              label="Повтори новый пароль"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={8}
              maxLength={128}
              required
              disabled={busy || !token}
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" disabled={busy || !token}>
              {busy ? "Меняем…" : "Сохранить новый пароль"}
              <Icon name="check" />
            </Button>
          </form>
        )}
      </Panel>
    </main>
  );
}
