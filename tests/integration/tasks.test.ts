import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import request from "supertest";
import { buildTestApp, loginAndGetToken, resetDb, testPrisma } from "./setup.js";

describe("CRUD de tasks", () => {
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

  it("POST /tasks válido por tipo (E com deadline) retorna 201 + body completo", async () => {
    const response = await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "Emergência", type: "E", deadline: "2030-01-01T00:00:00.000Z" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: "Emergência",
      type: "E",
      status: "open",
    });
    expect(response.body.id).toBeTruthy();
  });

  it("POST /tasks válido (M com deadline) retorna 201", async () => {
    const response = await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "Prazo definido", type: "M", deadline: "2030-01-01T00:00:00.000Z" });
    expect(response.status).toBe(201);
  });

  it("POST /tasks válido (S sem deadline) retorna 201", async () => {
    const response = await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "Longo prazo", type: "S" });
    expect(response.status).toBe(201);
    expect(response.body.deadline).toBeNull();
  });

  it("POST /tasks E sem deadline retorna 400 com código de validação", async () => {
    const response = await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "Sem prazo", type: "E" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /tasks M sem deadline retorna 400", async () => {
    const response = await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "Sem prazo", type: "M" });
    expect(response.status).toBe(400);
  });

  it("GET /tasks aplica ordem E > M > S e filtros combinados", async () => {
    await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "S-task", type: "S" });
    await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "M-task", type: "M", deadline: "2030-01-01T00:00:00.000Z" });
    await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "E-task", type: "E", deadline: "2030-01-01T00:00:00.000Z" });

    const response = await request(app.server).get("/tasks").set(auth());
    expect(response.status).toBe(200);
    expect(response.body.map((t: { type: string }) => t.type)).toEqual(["E", "M", "S"]);

    const filtered = await request(app.server).get("/tasks?type=S").set(auth());
    expect(filtered.body).toHaveLength(1);
    expect(filtered.body[0].type).toBe("S");
  });

  it("GET /tasks/:id retorna árvore de subtarefas aninhada correta", async () => {
    const task = await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "Com subtarefas", type: "S" });

    const parent = await request(app.server)
      .post(`/tasks/${task.body.id}/subtasks`)
      .set(auth())
      .send({ title: "Nível 1" });

    await request(app.server)
      .post(`/tasks/${task.body.id}/subtasks`)
      .set(auth())
      .send({ title: "Nível 2", parentId: parent.body.id });

    const response = await request(app.server).get(`/tasks/${task.body.id}`).set(auth());
    expect(response.status).toBe(200);
    expect(response.body.subtasks).toHaveLength(1);
    expect(response.body.subtasks[0].title).toBe("Nível 1");
    expect(response.body.subtasks[0].children).toHaveLength(1);
    expect(response.body.subtasks[0].children[0].title).toBe("Nível 2");
  });

  it("GET /tasks/:id inexistente retorna 404", async () => {
    const response = await request(app.server)
      .get("/tasks/00000000-0000-0000-0000-000000000000")
      .set(auth());
    expect(response.status).toBe(404);
  });

  it("PATCH status/deadline/budget/sort_order retorna 200", async () => {
    const task = await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "Editável", type: "S", sortOrder: 0 });

    const response = await request(app.server)
      .patch(`/tasks/${task.body.id}`)
      .set(auth())
      .send({ status: "in_progress", budget: 250.5, sortOrder: 3 });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("in_progress");
    expect(response.body.budget).toBe(250.5);
    expect(response.body.sortOrder).toBe(3);
  });

  it("PATCH S->M sem deadline retorna 400", async () => {
    const task = await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "Vira M", type: "S" });

    const response = await request(app.server)
      .patch(`/tasks/${task.body.id}`)
      .set(auth())
      .send({ type: "M" });

    expect(response.status).toBe(400);
  });

  it("DELETE retorna 204; task some da listagem; subtarefas removidas em cascata", async () => {
    const task = await request(app.server)
      .post("/tasks")
      .set(auth())
      .send({ title: "Para deletar", type: "S" });

    const subtask = await request(app.server)
      .post(`/tasks/${task.body.id}/subtasks`)
      .set(auth())
      .send({ title: "Filha" });

    const del = await request(app.server).delete(`/tasks/${task.body.id}`).set(auth());
    expect(del.status).toBe(204);

    const list = await request(app.server).get("/tasks").set(auth());
    expect(list.body.find((t: { id: string }) => t.id === task.body.id)).toBeUndefined();

    const orphanSubtask = await testPrisma.subtask.findUnique({ where: { id: subtask.body.id } });
    expect(orphanSubtask).toBeNull();
  });
});
