import { buildApp } from "./app.js";
import { prisma } from "../db/client.js";

const port = Number(process.env.PORT ?? 3000);
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET não configurado");
}

const app = await buildApp({ prisma, jwtSecret });

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`server listening on port ${port}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
