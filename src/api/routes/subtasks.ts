import type { FastifyInstance } from "fastify";
import type { Prisma, PrismaClient, Subtask } from "@prisma/client";
import { createSubtaskSchema, patchSubtaskSchema } from "../../domain/subtask-schema.js";
import { canMoveSubtask } from "../../domain/anti-cycle.js";
import { ConflictError, NotFoundError, ValidationError } from "../errors.js";
import { compact } from "../util.js";

function serializeSubtask(subtask: Subtask) {
  return {
    id: subtask.id,
    taskId: subtask.taskId,
    parentId: subtask.parentId,
    title: subtask.title,
    isDone: subtask.isDone,
    notes: subtask.notes,
    sortOrder: subtask.sortOrder,
    createdAt: subtask.createdAt.toISOString(),
    updatedAt: subtask.updatedAt.toISOString(),
  };
}

export function registerSubtaskRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.post("/tasks/:id/subtasks", async (request, reply) => {
    const { id: taskId } = request.params as { id: string };
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundError("task não encontrada");

    const parsed = createSubtaskSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }
    const data = parsed.data;

    if (data.parentId) {
      const parent = await prisma.subtask.findUnique({ where: { id: data.parentId } });
      if (!parent || parent.taskId !== taskId) {
        throw new ConflictError("parentId pertence a outra task");
      }
    }

    const subtask = await prisma.subtask.create({
      data: compact({
        taskId,
        parentId: data.parentId ?? null,
        title: data.title,
        notes: data.notes,
        sortOrder: data.sortOrder ?? 0,
      }) as Prisma.SubtaskUncheckedCreateInput,
    });

    reply.code(201);
    return serializeSubtask(subtask);
  });

  app.patch("/subtasks/:id", async (request) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.subtask.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("subtarefa não encontrada");

    const parsed = patchSubtaskSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }
    const patch = parsed.data;

    const parentIdProvided = Object.prototype.hasOwnProperty.call(patch, "parentId");
    if (parentIdProvided) {
      const allSubtasks = await prisma.subtask.findMany({
        where: { taskId: existing.taskId },
        select: { id: true, taskId: true, parentId: true },
      });
      const newParentId = patch.parentId ?? null;
      if (!canMoveSubtask(allSubtasks, id, newParentId)) {
        throw new ConflictError("movimento criaria um ciclo ou muda de task");
      }
    }

    const subtask = await prisma.subtask.update({
      where: { id },
      data: compact({
        title: patch.title,
        isDone: patch.isDone,
        notes: patch.notes,
        sortOrder: patch.sortOrder,
        parentId: parentIdProvided ? patch.parentId ?? null : undefined,
      }) as Prisma.SubtaskUncheckedUpdateInput,
    });

    return serializeSubtask(subtask);
  });

  app.delete("/subtasks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.subtask.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("subtarefa não encontrada");

    await prisma.subtask.delete({ where: { id } });
    reply.code(204);
    return null;
  });
}
