export class ApiError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}
// Only protected 401 responses expire a session. A failed login or network outage does not.
export async function apiFetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const headers = new Headers(options?.headers);
  // Existing API callers still accept a token argument during the transition.
  // The browser never sends or stores that legacy Bearer token.
  headers.delete("Authorization");
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });
  if (
    response.status === 401 &&
    !url.endsWith("/auth/login") &&
    !url.endsWith("/auth/register")
  ) {
    window.dispatchEvent(new Event("session-expired"));
  }
  return response;
}
export function errorMessage(
  error: unknown,
  fallback = "Не удалось выполнить действие. Попробуй ещё раз.",
) {
  if (error instanceof ApiError && error.status === 401)
    return "Сессия истекла. Войди снова.";
  if (error instanceof TypeError)
    return "Нет связи с сервером. Проверь подключение и повтори попытку.";
  return fallback;
}
