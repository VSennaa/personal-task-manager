import chalk from "chalk";
import { api } from "../api.js";
import { formatDeadline } from "../format.js";
import type { Task } from "../types.js";

const TYPE_LABEL: Record<Task["type"], string> = { E: "E", M: "M", S: "S" };

function formatTask(task: Task): string {
  const deadline = formatDeadline(task.deadline);
  const suffix = deadline ? ` (${deadline})` : "";
  const line = `[${TYPE_LABEL[task.type]}] ${task.title}${suffix}  ${chalk.dim(task.id)}`;

  if (task.type === "E") return chalk.bold.red(line);
  if (task.type === "M") return chalk.yellow(line);
  return chalk.white(line);
}

export async function listCommand(): Promise<void> {
  const tasks = await api.get<Task[]>("/tasks");

  if (tasks.length === 0) {
    console.log(chalk.dim("Nenhuma tarefa por aqui."));
    return;
  }

  for (const task of tasks) {
    console.log(formatTask(task));
  }
}
