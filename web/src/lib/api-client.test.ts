import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "./api-client";
import { clearToken, getToken, saveToken } from "./auth";

describe("createApiClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    clearToken();
    vi.unstubAllGlobals();
  });

  it("anexa o header Authorization quando há token salvo", async () => {
    saveToken("meu-token");
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    const client = createApiClient({ baseUrl: "https://api.test" });
    await client.get("/tasks");

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer meu-token");
  });

  it("em 401: limpa o token e chama onUnauthorized (para redirecionar ao login)", async () => {
    saveToken("token-expirado");
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "no" } }), {
        status: 401,
      }),
    );

    const onUnauthorized = vi.fn();
    const client = createApiClient({ baseUrl: "https://api.test", onUnauthorized });

    await expect(client.get("/tasks")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(getToken()).toBeNull();
  });

  it("em resposta de erro não-401, rejeita com ApiError contendo a mensagem do servidor", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "título obrigatório" } }), {
        status: 400,
      }),
    );

    const client = createApiClient({ baseUrl: "https://api.test" });
    await expect(client.post("/tasks", {})).rejects.toThrow("título obrigatório");
  });

  it("em 204, resolve com null", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(null, { status: 204 }));

    const client = createApiClient({ baseUrl: "https://api.test" });
    await expect(client.delete("/tasks/123")).resolves.toBeNull();
  });
});
