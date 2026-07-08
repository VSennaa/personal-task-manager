import type { FastifyInstance } from "fastify";
import type { Prisma, PrismaClient, Task } from "@prisma/client";
import { createTaskSchema, patchTaskSchema, taskStatusSchema, taskTypeSchema } from "../../domain/task-schema.js";
import { sortTasks, compareTasksForSort, type TaskForSort } from "../../domain/sort-tasks.js";
import { calculateProgress } from "../../domain/progress.js";
import { buildSubtaskTree, toProgressNodes } from "../subtask-tree.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { compact } from "../util.js";

function toSortShape(task: Task): TaskForSort {
  return {
    id: task.id,
    type: task.type,
    status: task.status,
    deadline: task.deadline ? task.deadline.toISOString() : null,
    sortOrder: task.sortOrder,
    createdAt: task.createdAt.toISOString(),
  };
}

function serializeTask(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    type: task.type,
    deadline: task.deadline ? task.deadline.toISOString() : null,
    budget: task.budget === null ? null : Number(task.budget),
    status: task.status,
    sortOrder: task.sortOrder,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

async function nextSortOrder(prisma: PrismaClient): Promise<number> {
  const last = await prisma.task.findFirst({
    where: { type: "S" },
    orderBy: { sortOrder: "desc" },
  });
  return last ? last.sortOrder + 1 : 0;
}

export function registerTaskRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get("/tasks", async (request) => {
    const query = request.query as { type?: string; status?: string };

    const where: Prisma.TaskWhereInput = {};
    if (query.type) {
      const parsedType = taskTypeSchema.safeParse(query.type);
      if (!parsedType.success) throw new ValidationError("type inválido");
      where.type = parsedType.data;
    }
    if (query.status) {
      const parsedStatus = taskStatusSchema.safeParse(query.status);
      if (!parsedStatus.success) throw new ValidationError("status inválido");
      where.status = parsedStatus.data;
    }

    const tasks = await prisma.task.findMany({ where });

    const ordered = query.status
      ? tasks.slice().sort((a, b) => compareTasksForSort(toSortShape(a), toSortShape(b)))
      : (() => {
          const byId = new Map(tasks.map((t) => [t.id, t] as const));
          return sortTasks(tasks.map(toSortShape)).map((t) => byId.get(t.id)!);
        })();

    return ordered.map(serializeTask);
  });

  app.post("/tasks", async (request, reply) => {
    const parsed = createTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const data = parsed.data;
    const sortOrder = data.sortOrder ?? (data.type === "S" ? await nextSortOrder(prisma) : 0);

    const task = await prisma.task.create({
      data: compact({
        title: data.title,
        description: data.description,
        type: data.type,
        deadline: data.deadline ? new Date(data.deadline) : null,
        budget: data.budget,
        status: data.status,
        sortOrder,
      }) as Prisma.TaskUncheckedCreateInput,
    });

    reply.code(201);
    return serializeTask(task);
  });

  app.get("/tasks/:id", async (request) => {
    const { id } = request.params as { id: string };
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundError("task não encontrada");

    const subtasks = await prisma.subtask.findMany({ where: { taskId: id } });
    const tree = buildSubtaskTree(subtasks);

    return { ...serializeTask(task), subtasks: tree };
  });

  app.patch("/tasks/:id", async (request) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("task não encontrada");

    const parsed = patchTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }
    const patch = parsed.data;

    const finalType = patch.type ?? existing.type;
    const deadlineProvided = Object.prototype.hasOwnProperty.call(patch, "deadline");
    const finalDeadline = deadlineProvided ? patch.deadline : existing.deadline?.toISOString();
    if ((finalType === "E" || finalType === "M") && !finalDeadline) {
      throw new ValidationError("deadline é obrigatório para tarefas do tipo E ou M");
    }

    const task = await prisma.task.update({
      where: { id },
      data: compact({
        title: patch.title,
        description: patch.description,
        type: patch.type,
        deadline: deadlineProvided ? (patch.deadline ? new Date(patch.deadline) : null) : undefined,
        budget: patch.budget,
        status: patch.status,
        sortOrder: patch.sortOrder,
      }) as Prisma.TaskUncheckedUpdateInput,
    });

    return serializeTask(task);
  });

  app.delete("/tasks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("task não encontrada");

    await prisma.task.delete({ where: { id } });
    reply.code(204);
    return null;
  });

  app.get("/tasks/:id/progress", async (request) => {
    const { id } = request.params as { id: string };
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundError("task não encontrada");

    const subtasks = await prisma.subtask.findMany({ where: { taskId: id } });
    const tree = buildSubtaskTree(subtasks);
    return calculateProgress(toProgressNodes(tree), task.status);
  });
}
