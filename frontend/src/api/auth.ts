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

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
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

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  return response.json() as Promise<TokenResponse>;
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
