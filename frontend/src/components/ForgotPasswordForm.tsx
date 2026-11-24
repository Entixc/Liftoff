import { type FormEvent, useState } from "react";
import { requestPasswordReset } from "../api/auth";
import { errorMessage } from "../api/http";
import { Button, Icon, Input } from "./ui";


export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (caught) {
      setError(errorMessage(caught, "Не удалось запросить восстановление."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div>
        <p className="eyebrow">ВОССТАНОВЛЕНИЕ</p>
        <h1>Вернём доступ.</h1>
        <p className="muted">
          Укажи подтверждённый email аккаунта. Ответ будет одинаковым для всех
          адресов.
        </p>
      </div>
      {sent ? (
        <p className="success-message" role="status">
          Если подтверждённый аккаунт с таким email существует, ссылка создана.
          Локально проверь терминал backend.
        </p>
      ) : (
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="you@example.com"
        />
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!sent && (
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Проверяем…" : "Получить ссылку"}
          <Icon name="arrow" />
        </Button>
      )}
      <button type="button" className="text-button" onClick={onBack}>
        Вернуться ко входу
      </button>
    </form>
  );
}
