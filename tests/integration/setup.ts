import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import request from "supertest";
import { buildApp } from "../../src/api/app.js";
import { hashPassword } from "../../src/domain/password.js";

config();

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL não configurado (.env)");
}

export const TEST_JWT_SECRET = "test-secret";

export const testPrisma = new PrismaClient({
  datasources: { db: { url: testDatabaseUrl } },
});

export async function resetDb(): Promise<void> {
  await testPrisma.subtask.deleteMany();
  await testPrisma.task.deleteMany();
  await testPrisma.user.deleteMany();
}

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({ prisma: testPrisma, jwtSecret: TEST_JWT_SECRET });
  await app.ready();
  return app;
}

export async function createTestUser(
  username = "tester",
  password = "senha-forte-123",
): Promise<{ username: string; password: string }> {
  const passwordHash = await hashPassword(password);
  await testPrisma.user.create({ data: { username, passwordHash } });
  return { username, password };
}

export async function loginAndGetToken(app: FastifyInstance): Promise<string> {
  const { username, password } = await createTestUser();
  const response = await request(app.server).post("/auth/login").send({ username, password });
  return (response.body as { token: string }).token;
}

/**
 * Cria um usuário e assina o JWT diretamente (sem HTTP), para suítes que
 * precisam de um token válido em todo `beforeEach` mas não estão testando o
 * fluxo de login em si — evitar isso esgota o rate limit de 5/min do
 * POST /auth/login, que é real e compartilhado pela instância do app.
 */
export async function createAuthenticatedUser(
  app: FastifyInstance,
  username = "tester",
): Promise<string> {
  const passwordHash = await hashPassword("senha-forte-123");
  const user = await testPrisma.user.create({ data: { username, passwordHash } });
  return app.jwt.sign({ sub: user.id, username: user.username }, { expiresIn: "30d" });
}
