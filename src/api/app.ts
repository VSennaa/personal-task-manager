import Fastify, { type FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import type { PrismaClient } from "@prisma/client";
import { ZodError } from "zod";
import { registerAuth } from "./plugins/auth.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerTaskRoutes } from "./routes/tasks.js";
import { registerSubtaskRoutes } from "./routes/subtasks.js";
import { ApiError } from "./errors.js";

export interface BuildAppOptions {
  prisma: PrismaClient;
  jwtSecret: string;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const { prisma, jwtSecret } = options;

  await app.register(rateLimit, { global: false });
  await registerAuth(app, jwtSecret);

  app.get("/health", async () => ({ status: "ok" }));

  registerAuthRoutes(app, prisma);
  registerTaskRoutes(app, prisma);
  registerSubtaskRoutes(app, prisma);

  app.setErrorHandler((error: unknown, _request, reply) => {
    if (error instanceof ApiError) {
      reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
      return;
    }

    if (error instanceof ZodError) {
      reply.code(400).send({
        error: { code: "VALIDATION_ERROR", message: error.issues.map((i) => i.message).join("; ") },
      });
      return;
    }

    const statusCode =
      error instanceof Error && "statusCode" in error
        ? ((error as { statusCode?: number }).statusCode ?? 500)
        : 500;

    if (statusCode === 429) {
      reply.code(429).send({
        error: { code: "RATE_LIMITED", message: "muitas tentativas, tente novamente em instantes" },
      });
      return;
    }

    app.log.error(error);
    reply.code(statusCode).send({
      error: { code: "INTERNAL_ERROR", message: "erro interno" },
    });
  });

  return app;
}
