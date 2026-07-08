import chalk from "chalk";
import { api } from "../api.js";
import type { Task } from "../types.js";

export async function doneCommand(id: string): Promise<void> {
  const task = await api.patch<Task>(`/tasks/${id}`, { status: "done" });
  console.log(chalk.green(`Tarefa concluída: ${task.title}`));
}
