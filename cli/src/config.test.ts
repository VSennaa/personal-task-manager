import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { clearToken, loadConfig, saveConfig, saveToken } from "./config.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "task-cli-test-"));
  process.env.TASK_CLI_CONFIG_DIR = tmpDir;
  delete process.env.TASK_CLI_API_URL;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.TASK_CLI_CONFIG_DIR;
  delete process.env.TASK_CLI_API_URL;
});

describe("cli config", () => {
  it("retorna apiUrl padrão quando não há config salva", () => {
    const config = loadConfig();
    expect(config.apiUrl).toBe("https://vsenaa.duckdns.org/api");
    expect(config.token).toBeUndefined();
  });

  it("TASK_CLI_API_URL sobrescreve a apiUrl padrão e a salva", () => {
    process.env.TASK_CLI_API_URL = "http://localhost:3000";
    expect(loadConfig().apiUrl).toBe("http://localhost:3000");
  });

  it("saveToken persiste o token; loadConfig lê de volta", () => {
    saveToken("meu-token");
    expect(loadConfig().token).toBe("meu-token");
  });

  it("clearToken remove o token mas mantém apiUrl", () => {
    saveConfig({ apiUrl: "http://custom", token: "abc" });
    clearToken();
    const config = loadConfig();
    expect(config.token).toBeUndefined();
    expect(config.apiUrl).toBe("http://custom");
  });
});
