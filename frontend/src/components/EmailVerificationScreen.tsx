import { useEffect, useRef, useState } from "react";
import { verifyEmail } from "../api/auth";
import { Brand } from "./AppShell";
import { Button, Icon, LoadingState, Panel } from "./ui";


export function EmailVerificationScreen({
  token,
  onContinue,
}: {
  token: string;
  onContinue: () => void;
}) {
  const started = useRef(false);
  const [status, setStatus] = useState<"checking" | "success" | "error">(
    "checking",
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setStatus("error");
      return;
    }
    void verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "checking") return <LoadingState />;

  return (
    <main className="verification-layout">
      <Brand />
      <Panel className="verification-card">
        <span className={`verification-icon ${status}`}>
          <Icon name={status === "success" ? "check" : "close"} size={30} />
        </span>
        <p className="eyebrow">EMAIL</p>
        <h1>
          {status === "success"
            ? "Адрес подтверждён"
            : "Ссылка недействительна"}
        </h1>
        <p className="muted">
          {status === "success"
            ? "Теперь этот адрес можно будет использовать для безопасного восстановления доступа."
            : "Ссылка уже использована или истекла. Войди в профиль и запроси новую."}
        </p>
        <Button variant="primary" onClick={onContinue}>
          Продолжить
          <Icon name="arrow" />
        </Button>
      </Panel>
    </main>
  );
}
