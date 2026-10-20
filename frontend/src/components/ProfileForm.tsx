import { type FormEvent, useState } from "react";
import { updateMyProfile, type UserProfile } from "../api/auth";
import { errorMessage } from "../api/http";
import { Button, Icon, Input, Panel, useUI } from "./ui";

export function ProfileForm({
  profile,
  token,
  onProfileUpdated,
}: {
  profile: UserProfile;
  token: string;
  onProfileUpdated: (profile: UserProfile) => void;
}) {
  const [height, setHeight] = useState(profile.height_cm?.toString() ?? "");
  const [weight, setWeight] = useState(profile.body_weight_kg ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { notify } = useUI();
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onProfileUpdated(
        await updateMyProfile(token, {
          height_cm: height === "" ? null : Number(height),
          body_weight_kg: weight === "" ? null : Number(weight),
        }),
      );
      notify("Данные профиля сохранены");
    } catch (e) {
      setError(errorMessage(e, "Не удалось сохранить профиль."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel>
      <div className="section-heading">
        <h2>Твои параметры</h2>
        <Icon name="user" />
      </div>
      <p className="muted">Обновляй данные, когда они меняются.</p>
      <form className="profile-form" onSubmit={submit}>
        <div className="two-columns">
          <Input
            label="Рост, см"
            type="number"
            min="1"
            step="1"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="Не указан"
          />
          <Input
            label="Вес, кг"
            type="number"
            min="0.01"
            max="999.99"
            step="0.01"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Не указан"
          />
        </div>
        <p className="field-hint">
          Чтобы очистить параметр, оставь поле пустым и сохрани.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Сохраняем…" : "Сохранить изменения"}
          <Icon name="check" />
        </Button>
      </form>
    </Panel>
  );
}
