import { clearToken, getToken } from "./auth";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  onUnauthorized?: () => void;
}

export interface ApiClient {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, data?: unknown): Promise<T>;
  patch<T = unknown>(path: string, data?: unknown): Promise<T>;
  delete<T = unknown>(path: string): Promise<T>;
}

export function createApiClient({ baseUrl, onUnauthorized }: ApiClientOptions): ApiClient {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });

    if (response.status === 401) {
      clearToken();
      onUnauthorized?.();
      throw new ApiError(401, "sessão expirada, faça login novamente");
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message =
        (body as { error?: { message?: string } } | null)?.error?.message ??
        "erro na requisição";
      throw new ApiError(response.status, message);
    }

    if (response.status === 204) {
      return null as T;
    }

    return (await response.json()) as T;
  }

  return {
    get: (path) => request(path),
    post: (path, data) =>
      request(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
    patch: (path, data) =>
      request(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }),
    delete: (path) => request(path, { method: "DELETE" }),
  };
}
