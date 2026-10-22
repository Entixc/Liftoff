import { type FormEvent, useState } from "react";
import { changePassword } from "../api/auth";
import { ApiError, errorMessage } from "../api/http";
import { Button, Icon, Panel, PasswordInput, useUI } from "./ui";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { notify } = useUI();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmation) {
      setError("Новые пароли не совпадают.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Новый пароль должен отличаться от текущего.");
      return;
    }

    setBusy(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      notify("Пароль изменён. Другие сессии завершены");
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 400
          ? "Текущий пароль указан неверно."
          : errorMessage(cause, "Не удалось изменить пароль."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <div className="section-heading">
        <div>
          <h2>Безопасность</h2>
          <p className="muted">
            После смены пароля вход на других устройствах будет завершён.
          </p>
        </div>
        <Icon name="lock" />
      </div>
      <form className="profile-form" onSubmit={submit}>
        <PasswordInput
          label="Текущий пароль"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          minLength={8}
          maxLength={128}
          required
          disabled={busy}
        />
        <PasswordInput
          label="Новый пароль"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          minLength={8}
          maxLength={128}
          required
          disabled={busy}
        />
        <PasswordInput
          label="Повтори новый пароль"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          minLength={8}
          maxLength={128}
          required
          disabled={busy}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Меняем…" : "Сменить пароль"}
          <Icon name="check" />
        </Button>
      </form>
    </Panel>
  );
}
