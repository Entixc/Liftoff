export class ApiError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}
// Only authenticated 401 responses expire a session. A failed login or network outage does not.
export async function apiFetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const response = await fetch(url, options);
  const authorization = new Headers(options?.headers).get("Authorization");
  if (response.status === 401 && authorization) {
    window.dispatchEvent(
      new CustomEvent("session-expired", { detail: authorization.slice(7) }),
    );
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
