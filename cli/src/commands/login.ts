import chalk from "chalk";
import { api } from "../api.js";
import { loadConfig, saveConfig } from "../config.js";

export async function loginCommand(
  username: string,
  password: string,
  options: { apiUrl?: string },
): Promise<void> {
  if (options.apiUrl) {
    const config = loadConfig();
    saveConfig({ ...config, apiUrl: options.apiUrl });
  }

  const { token } = await api.post<{ token: string }>("/auth/login", { username, password });
  const config = loadConfig();
  saveConfig({ ...config, token });

  console.log(chalk.green(`Login efetuado como "${username}".`));
}
