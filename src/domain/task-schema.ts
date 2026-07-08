import { z } from "zod";

export const taskTypeSchema = z.enum(["E", "M", "S"]);
export const taskStatusSchema = z.enum(["open", "in_progress", "done", "cancelled"]);

const baseTaskFields = {
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  deadline: z.string().datetime().optional(),
  budget: z.number().nonnegative().optional(),
  status: taskStatusSchema.default("open"),
  sortOrder: z.number().int().optional(),
};

function deadlineRequiredForType(data: { type: string; deadline?: string | undefined }) {
  if ((data.type === "E" || data.type === "M") && !data.deadline) {
    return false;
  }
  return true;
}

export const createTaskSchema = z
  .object({
    ...baseTaskFields,
    type: taskTypeSchema,
  })
  .refine(deadlineRequiredForType, {
    message: "deadline é obrigatório para tarefas do tipo E ou M",
    path: ["deadline"],
  });

export const patchTaskSchema = z
  .object({
    title: baseTaskFields.title.optional(),
    description: baseTaskFields.description,
    type: taskTypeSchema.optional(),
    deadline: baseTaskFields.deadline,
    budget: baseTaskFields.budget,
    status: taskStatusSchema.optional(),
    sortOrder: baseTaskFields.sortOrder,
  })
  .refine(
    (data) => {
      if (data.type === undefined) return true;
      return deadlineRequiredForType({ type: data.type, deadline: data.deadline });
    },
    {
      message: "deadline é obrigatório ao definir type como E ou M",
      path: ["deadline"],
    },
  );

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type PatchTaskInput = z.infer<typeof patchTaskSchema>;
