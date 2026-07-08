import chalk from "chalk";
import { api } from "../api.js";
import type { Subtask } from "../types.js";

export async function subDoneCommand(id: string): Promise<void> {
  const subtask = await api.patch<Subtask>(`/subtasks/${id}`, { isDone: true });
  console.log(chalk.green(`Subtarefa concluída: ${subtask.title}`));
}
