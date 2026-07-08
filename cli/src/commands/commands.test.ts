import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { saveConfig } from "../config.js";
import { addCommand } from "./add.js";
import { listCommand } from "./list.js";
import { doneCommand } from "./done.js";

let tmpDir: string;
let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "task-cli-test-"));
  process.env.TASK_CLI_CONFIG_DIR = tmpDir;
  saveConfig({ apiUrl: "https://api.test", token: "meu-token" });
  vi.stubGlobal("fetch", vi.fn());
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.TASK_CLI_CONFIG_DIR;
  vi.unstubAllGlobals();
  logSpy.mockRestore();
});

describe("addCommand", () => {
  it("rejeita localmente (sem chamar a rede) E sem deadline", async () => {
    await expect(addCommand("Sem prazo", { type: "E" })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cria a tarefa e imprime confirmação", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ id: "1", type: "S", title: "Nova" }), { status: 201 }),
    );

    await addCommand("Nova", { type: "S" });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/tasks",
      expect.objectContaining({ method: "POST" }),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Nova"));
  });
});

describe("listCommand", () => {
  it("imprime mensagem quando não há tarefas", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    await listCommand();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Nenhuma tarefa"));
  });
});

describe("doneCommand", () => {
  it("faz PATCH em /tasks/:id com status done", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ id: "1", title: "Concluída" }), { status: 200 }),
    );

    await doneCommand("1");

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test/tasks/1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ status: "done" });
  });
});
