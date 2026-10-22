import { API_URL } from "./config";
import { apiFetch as fetch, ApiError } from "./http";

export type LoginPayload = {
  nickname: string;
  password: string;
};

export type RegisterPayload = {
  nickname: string;
  password: string;
};

export type UserProfile = {
  id: number;
  nickname: string;
  height_cm: number | null;
  body_weight_kg: string | null;
  created_at: string;
};

export type UpdateProfilePayload = {
  height_cm?: number | null;
  body_weight_kg?: number | null;
};

export type BodyWeightEntry = {
  id: number;
  weight_kg: string;
  recorded_at: string;
};

export async function getBodyWeightHistory(
  token: string,
): Promise<BodyWeightEntry[]> {
  const response = await fetch(`${API_URL}/auth/me/weight-history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<BodyWeightEntry[]>;
}

export async function login(payload: LoginPayload): Promise<void> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Client": "browser",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError(response.status);
  }
}

export async function logoutSession(): Promise<void> {
  const response = await fetch(`${API_URL}/auth/logout`, { method: "POST" });
  if (!response.ok) throw new ApiError(response.status);
}

export async function register(payload: RegisterPayload): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  return response.json() as Promise<UserProfile>;
}

export async function getMyProfile(token: string): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  return response.json() as Promise<UserProfile>;
}

export async function restoreSession(): Promise<boolean> {
  // A missing session is expected on the login screen; do not announce expiry.
  const response = await globalThis.fetch(`${API_URL}/auth/me`, {
    credentials: "include",
  });
  if (response.status === 401) return false;
  if (!response.ok) throw new ApiError(response.status);
  return true;
}

export async function updateMyProfile(
  token: string,
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  return response.json() as Promise<UserProfile>;
}
