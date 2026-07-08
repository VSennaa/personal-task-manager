import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import request from "supertest";
import { buildTestApp, createAuthenticatedUser, resetDb, testPrisma } from "./setup.js";

describe("CRUD de subtasks", () => {
  let app: FastifyInstance;
  let token: string;
  let taskId: string;
  let otherTaskId: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    token = await createAuthenticatedUser(app);
    const task = await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "Task raiz", type: "S" });
    taskId = task.body.id;

    const other = await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "Outra task", type: "S" });
    otherTaskId = other.body.id;
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await app.close();
    await testPrisma.$disconnect();
  });

  function auth() {
    return { Authorization: `Bearer ${token}` };
  }

  it("POST em task sem parent cria subtarefa de 1º nível", async () => {
    const response = await request(app.server)
      .post(`/tasks/${taskId}/subtasks`)
      .set(auth())
      .send({ title: "Nível 1" });

    expect(response.status).toBe(201);
    expect(response.body.parentId).toBeNull();
    expect(response.body.taskId).toBe(taskId);
  });

  it("POST com parentId cria subtarefa aninhada, profundidade 5+ funciona", async () => {
    let parentId: string | null = null;
    let lastId = "";
    for (let depth = 0; depth < 6; depth++) {
      const response = await request(app.server)
        .post(`/tasks/${taskId}/subtasks`)
        .set(auth())
        .send({ title: `Nível ${depth}`, ...(parentId ? { parentId } : {}) });
      expect(response.status).toBe(201);
      parentId = response.body.id;
      lastId = response.body.id;
    }

    const tree = await request(app.server).get(`/tasks/${taskId}`).set(auth());
    let node = tree.body.subtasks[0];
    let depthCount = 1;
    while (node.children.length > 0) {
      node = node.children[0];
      depthCount++;
    }
    expect(depthCount).toBe(6);
    expect(node.id).toBe(lastId);
  });

  it("POST com parentId de outra task retorna 409", async () => {
    const otherSubtask = await request(app.server)
      .post(`/tasks/${otherTaskId}/subtasks`)
      .set(auth())
      .send({ title: "Da outra task" });

    const response = await request(app.server)
      .post(`/tasks/${taskId}/subtasks`)
      .set(auth())
      .send({ title: "Tentando aninhar cross-task", parentId: otherSubtask.body.id });

    expect(response.status).toBe(409);
  });

  it("PATCH is_done é refletido no progresso", async () => {
    const subtask = await request(app.server)
      .post(`/tasks/${taskId}/subtasks`)
      .set(auth())
      .send({ title: "Folha" });

    let progress = await request(app.server).get(`/tasks/${taskId}/progress`).set(auth());
    expect(progress.body).toEqual({ totalLeaves: 1, doneLeaves: 0, percent: 0 });

    await request(app.server)
      .patch(`/subtasks/${subtask.body.id}`)
      .set(auth())
      .send({ isDone: true });

    progress = await request(app.server).get(`/tasks/${taskId}/progress`).set(auth());
    expect(progress.body).toEqual({ totalLeaves: 1, doneLeaves: 1, percent: 100 });
  });

  it("PATCH parent_id criando ciclo retorna 409", async () => {
    const root = await request(app.server)
      .post(`/tasks/${taskId}/subtasks`)
      .set(auth())
      .send({ title: "Raiz" });
    const child = await request(app.server)
      .post(`/tasks/${taskId}/subtasks`)
      .set(auth())
      .send({ title: "Filha", parentId: root.body.id });

    const response = await request(app.server)
      .patch(`/subtasks/${root.body.id}`)
      .set(auth())
      .send({ parentId: child.body.id });

    expect(response.status).toBe(409);
  });

  it("PATCH sort_order reordena dentro do nível", async () => {
    const subtask = await request(app.server)
      .post(`/tasks/${taskId}/subtasks`)
      .set(auth())
      .send({ title: "Reordenável", sortOrder: 0 });

    const response = await request(app.server)
      .patch(`/subtasks/${subtask.body.id}`)
      .set(auth())
      .send({ sortOrder: 5 });

    expect(response.status).toBe(200);
    expect(response.body.sortOrder).toBe(5);
  });

  it("DELETE de nó intermediário remove descendentes em cascata", async () => {
    const root = await request(app.server)
      .post(`/tasks/${taskId}/subtasks`)
      .set(auth())
      .send({ title: "Raiz" });
    const child = await request(app.server)
      .post(`/tasks/${taskId}/subtasks`)
      .set(auth())
      .send({ title: "Filha", parentId: root.body.id });
    const grandchild = await request(app.server)
      .post(`/tasks/${taskId}/subtasks`)
      .set(auth())
      .send({ title: "Neta", parentId: child.body.id });

    const del = await request(app.server).delete(`/subtasks/${child.body.id}`).set(auth());
    expect(del.status).toBe(204);

    const remainingChild = await testPrisma.subtask.findUnique({ where: { id: child.body.id } });
    const remainingGrandchild = await testPrisma.subtask.findUnique({
      where: { id: grandchild.body.id },
    });
    const remainingRoot = await testPrisma.subtask.findUnique({ where: { id: root.body.id } });

    expect(remainingChild).toBeNull();
    expect(remainingGrandchild).toBeNull();
    expect(remainingRoot).not.toBeNull();
  });
});
