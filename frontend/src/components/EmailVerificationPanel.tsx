import { useState } from "react";
import {
  resendEmailVerification,
  type UserProfile,
} from "../api/auth";
import { ApiError, errorMessage } from "../api/http";
import { Badge, Button, Icon, Panel, useUI } from "./ui";


export function EmailVerificationPanel({ profile }: { profile: UserProfile }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useUI();
  const verified = profile.email_verified_at !== null;

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      await resendEmailVerification();
      notify("Новая ссылка подтверждения создана");
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 429
          ? "Ссылка уже отправлена. Подожди минуту перед повтором."
          : errorMessage(caught, "Не удалось создать новую ссылку."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <div className="section-heading">
        <div>
          <h2>Подтверждение email</h2>
          <p className="muted">{profile.email}</p>
        </div>
        <Badge active={verified}>
          {verified ? "Подтверждён" : "Не подтверждён"}
        </Badge>
      </div>
      {!verified && (
        <>
          <p className="field-hint">
            Локально ссылка появится в терминале backend и будет действовать 24
            часа.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button onClick={() => void resend()} disabled={busy}>
            <Icon name="arrow" />
            {busy ? "Создаём…" : "Отправить ссылку ещё раз"}
          </Button>
        </>
      )}
    </Panel>
  );
}
