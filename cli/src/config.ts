import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface CliConfig {
  apiUrl: string;
  token?: string;
}

const DEFAULT_API_URL = "https://vsenaa.duckdns.org/api";

function configDir(): string {
  return process.env.TASK_CLI_CONFIG_DIR ?? path.join(os.homedir(), ".config", "task-cli");
}

function configPath(): string {
  return path.join(configDir(), "config.json");
}

export function loadConfig(): CliConfig {
  const filePath = configPath();
  if (!fs.existsSync(filePath)) {
    return { apiUrl: process.env.TASK_CLI_API_URL ?? DEFAULT_API_URL };
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<CliConfig>;
  return {
    apiUrl: process.env.TASK_CLI_API_URL ?? parsed.apiUrl ?? DEFAULT_API_URL,
    token: parsed.token,
  };
}

export function saveConfig(config: CliConfig): void {
  const dir = configDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2), "utf8");
}

export function saveToken(token: string): void {
  const config = loadConfig();
  saveConfig({ ...config, token });
}

export function clearToken(): void {
  const config = loadConfig();
  const { token: _token, ...rest } = config;
  void _token;
  saveConfig(rest);
}
