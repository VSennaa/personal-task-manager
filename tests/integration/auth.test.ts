import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import request from "supertest";
import { buildTestApp, createTestUser, resetDb, testPrisma } from "./setup.js";

describe("Auth", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await app.close();
    await testPrisma.$disconnect();
  });

  it("login com credenciais corretas retorna 200 + JWT válido", async () => {
    const { username, password } = await createTestUser();

    const response = await request(app.server).post("/auth/login").send({ username, password });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe("string");
    expect(response.body.token.split(".")).toHaveLength(3);
  });

  it("senha errada retorna 401 com mensagem genérica", async () => {
    const { username } = await createTestUser();

    const response = await request(app.server)
      .post("/auth/login")
      .send({ username, password: "senha-errada" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("usuário inexistente retorna 401 (mesma mensagem genérica)", async () => {
    const response = await request(app.server)
      .post("/auth/login")
      .send({ username: "nao-existe", password: "qualquer" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("endpoint protegido sem token retorna 401", async () => {
    const response = await request(app.server).get("/tasks");
    expect(response.status).toBe(401);
  });

  it("token inválido retorna 401", async () => {
    const response = await request(app.server)
      .get("/tasks")
      .set("Authorization", "Bearer token-invalido");
    expect(response.status).toBe(401);
  });

  it("token válido retorna 200", async () => {
    const { username, password } = await createTestUser();
    const login = await request(app.server).post("/auth/login").send({ username, password });

    const response = await request(app.server)
      .get("/tasks")
      .set("Authorization", `Bearer ${login.body.token}`);

    expect(response.status).toBe(200);
  });

  it("/health é acessível sem token", async () => {
    const response = await request(app.server).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("6ª tentativa de login no mesmo minuto/IP retorna 429", async () => {
    const { username } = await createTestUser();

    for (let i = 0; i < 5; i++) {
      await request(app.server)
        .post("/auth/login")
        .send({ username, password: "senha-errada" });
    }

    const response = await request(app.server)
      .post("/auth/login")
      .send({ username, password: "senha-errada" });

    expect(response.status).toBe(429);
  });
});
