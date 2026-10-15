import { type FormEvent, useState } from "react";

import {
  updateMyProfile,
  type UserProfile,
} from "../api/auth";

type ProfileFormProps = {
  profile: UserProfile;
  token: string;
  onProfileUpdated: (profile: UserProfile) => void;
};

export function ProfileForm({
  profile,
  token,
  onProfileUpdated,
}: ProfileFormProps) {
  const [heightCm, setHeightCm] = useState(
    profile.height_cm?.toString() ?? "",
  );
  const [bodyWeightKg, setBodyWeightKg] = useState(
    profile.body_weight_kg ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaved(false);
    setIsSubmitting(true);

    try {
      const updatedProfile = await updateMyProfile(token, {
        height_cm: heightCm === "" ? null : Number(heightCm),
        body_weight_kg:
          bodyWeightKg === "" ? null : Number(bodyWeightKg),
      });

      onProfileUpdated(updatedProfile);
      setIsSaved(true);
    } catch {
      setError("Не удалось сохранить профиль.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Профиль</h2>

      <label>
        Рост, см
        <input
          type="number"
          min="1"
          value={heightCm}
          onChange={(event) => setHeightCm(event.target.value)}
        />
      </label>

      <label>
        Вес, кг
        <input
          type="number"
          min="0.01"
          max="999.99"
          step="0.01"
          value={bodyWeightKg}
          onChange={(event) => setBodyWeightKg(event.target.value)}
        />
      </label>

      {error && <p>{error}</p>}
      {isSaved && <p>Профиль сохранён.</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Сохраняем..." : "Сохранить"}
      </button>
    </form>
  );
}
