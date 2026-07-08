import { z } from "zod";

export const createSubtaskSchema = z.object({
  parentId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const patchSubtaskSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200).optional(),
  isDone: z.boolean().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type PatchSubtaskInput = z.infer<typeof patchSubtaskSchema>;
