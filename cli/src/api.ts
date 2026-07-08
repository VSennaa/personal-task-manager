import { loadConfig, clearToken } from "./config.js";

export class CliApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = loadConfig();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (config.token) {
    headers.set("Authorization", `Bearer ${config.token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, { ...init, headers });
  } catch {
    throw new CliApiError(0, `não foi possível conectar em ${config.apiUrl}`);
  }

  if (response.status === 401) {
    clearToken();
    throw new CliApiError(401, "sessão expirada ou ausente — rode `task login` novamente");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      (body as { error?: { message?: string } } | null)?.error?.message ?? "erro na requisição";
    throw new CliApiError(response.status, message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path),
  post: <T = unknown>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T = unknown>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T = unknown>(path: string) => request<T>(path, { method: "DELETE" }),
};
