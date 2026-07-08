import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { verifyPassword } from "../../domain/password.js";
import { UnauthorizedError, ValidationError } from "../errors.js";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export function registerAuthRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("username e password são obrigatórios");
      }

      const { username, password } = parsed.data;
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        throw new UnauthorizedError();
      }

      const passwordOk = await verifyPassword(user.passwordHash, password);
      if (!passwordOk) {
        throw new UnauthorizedError();
      }

      const token = app.jwt.sign(
        { sub: user.id, username: user.username },
        { expiresIn: process.env.JWT_EXPIRES_IN ?? "30d" },
      );

      return { token };
    },
  );
}
