import { config } from "dotenv";
import { execSync } from "node:child_process";

config();

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL não configurado (.env)");
}

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: testDatabaseUrl },
});
