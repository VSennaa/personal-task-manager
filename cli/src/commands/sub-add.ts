import chalk from "chalk";
import { createSubtaskSchema } from "../../../src/domain/subtask-schema.js";
import { api } from "../api.js";
import type { Subtask } from "../types.js";

export async function subAddCommand(
  taskId: string,
  title: string,
  options: { parent?: string },
): Promise<void> {
  const parsed = createSubtaskSchema.safeParse({ title, parentId: options.parent });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }

  const subtask = await api.post<Subtask>(`/tasks/${taskId}/subtasks`, parsed.data);
  console.log(chalk.green(`Subtarefa criada: ${subtask.title}  ${chalk.dim(subtask.id)}`));
}
