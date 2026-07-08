import chalk from "chalk";
import { createTaskSchema } from "../../../src/domain/task-schema.js";
import { api } from "../api.js";
import type { Task } from "../types.js";

export interface AddOptions {
  type: "E" | "M" | "S";
  deadline?: string;
}

export async function addCommand(title: string, options: AddOptions): Promise<void> {
  const parsed = createTaskSchema.safeParse({
    title,
    type: options.type,
    deadline: options.deadline,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }

  const task = await api.post<Task>("/tasks", parsed.data);
  console.log(chalk.green(`Tarefa criada: [${task.type}] ${task.title}  ${chalk.dim(task.id)}`));
}
