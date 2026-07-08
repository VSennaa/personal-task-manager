import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { api, CliApiError } from "./api.js";
import { saveConfig } from "./config.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "task-cli-test-"));
  process.env.TASK_CLI_CONFIG_DIR = tmpDir;
  delete process.env.TASK_CLI_API_URL;
  saveConfig({ apiUrl: "https://api.test", token: "meu-token" });
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.TASK_CLI_CONFIG_DIR;
  vi.unstubAllGlobals();
});

describe("cli api client", () => {
  it("anexa Authorization com o token salvo", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    await api.get("/tasks");

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer meu-token");
  });

  it("em 401: erro amigável pedindo novo login, e limpa o token salvo", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHORIZED" } }), { status: 401 }),
    );

    await expect(api.get("/tasks")).rejects.toThrow(/task login/);

    const fresh = fs.readFileSync(path.join(tmpDir, "config.json"), "utf8");
    expect(JSON.parse(fresh).token).toBeUndefined();
  });

  it("em falha de rede: erro amigável mencionando a URL configurada", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError("fetch failed"));

    await expect(api.get("/tasks")).rejects.toThrow(/https:\/\/api\.test/);
  });

  it("em erro de validação (400): propaga a mensagem do servidor", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "título obrigatório" } }), {
        status: 400,
      }),
    );

    await expect(api.post("/tasks", {})).rejects.toThrow("título obrigatório");
  });

  it("erros são instâncias de CliApiError com o status correto", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(null, { status: 404 }));

    try {
      await api.get("/tasks/inexistente");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(CliApiError);
      expect((err as CliApiError).status).toBe(404);
    }
  });
});
