import chalk from "chalk";
import { api } from "../api.js";

export async function rmCommand(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
  console.log(chalk.green(`Tarefa removida: ${id}`));
}
