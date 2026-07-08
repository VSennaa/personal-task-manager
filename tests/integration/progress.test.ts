import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import request from "supertest";
import { buildTestApp, loginAndGetToken, resetDb, testPrisma } from "./setup.js";

describe("GET /tasks/:id/progress", () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    token = await loginAndGetToken(app);
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

  it("espelha a árvore da spec §2.4 (A done; B -> B1 done, B2 aberta) -> 2/3", async () => {
    const task = await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "Árvore de exemplo", type: "S" });

    const a = await request(app.server)
      .post(`/tasks/${task.body.id}/subtasks`)
      .set(auth())
      .send({ title: "A" });
    await request(app.server).patch(`/subtasks/${a.body.id}`).set(auth()).send({ isDone: true });

    const b = await request(app.server)
      .post(`/tasks/${task.body.id}/subtasks`)
      .set(auth())
      .send({ title: "B" });
    const b1 = await request(app.server)
      .post(`/tasks/${task.body.id}/subtasks`)
      .set(auth())
      .send({ title: "B1", parentId: b.body.id });
    await request(app.server).patch(`/subtasks/${b1.body.id}`).set(auth()).send({ isDone: true });
    await request(app.server)
      .post(`/tasks/${task.body.id}/subtasks`)
      .set(auth())
      .send({ title: "B2", parentId: b.body.id });

    const response = await request(app.server).get(`/tasks/${task.body.id}/progress`).set(auth());
    expect(response.status).toBe(200);
    expect(response.body.totalLeaves).toBe(3);
    expect(response.body.doneLeaves).toBe(2);
    expect(response.body.percent).toBeCloseTo(66.7, 1);
  });

  it("task sem subtarefas e status done retorna 100%", async () => {
    const task = await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "Sem subtarefas", type: "S" });
    await request(app.server).patch(`/tasks/${task.body.id}`).set(auth()).send({ status: "done" });

    const response = await request(app.server).get(`/tasks/${task.body.id}/progress`).set(auth());
    expect(response.body).toEqual({ totalLeaves: 0, doneLeaves: 0, percent: 100 });
  });

  it("task inexistente retorna 404", async () => {
    const response = await request(app.server)
      .get("/tasks/00000000-0000-0000-0000-000000000000/progress")
      .set(auth());
    expect(response.status).toBe(404);
  });
});
