import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError } from "../errors.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; username: string };
    user: { sub: string; username: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const PUBLIC_ROUTES: ReadonlyArray<{ method: string; url: string }> = [
  { method: "POST", url: "/auth/login" },
  { method: "GET", url: "/health" },
];

function isPublicRoute(method: string, url: string): boolean {
  return PUBLIC_ROUTES.some((route) => route.method === method && route.url === url);
}

export async function registerAuth(app: FastifyInstance, jwtSecret: string): Promise<void> {
  await app.register(jwt, { secret: jwtSecret });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError("token ausente ou inválido");
    }
    void reply;
  });

  app.addHook("onRequest", async (request, reply) => {
    if (isPublicRoute(request.method, request.routeOptions?.url ?? request.url)) {
      return;
    }
    await app.authenticate(request, reply);
  });
}
