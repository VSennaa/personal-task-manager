import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          hookTimeout: 30000,
          testTimeout: 30000,
          // Todas as suítes compartilham um único Postgres de teste
          // (resetado entre suítes); rodar arquivos em paralelo causa
          // corrida entre resetDb() de um arquivo e dados de outro.
          fileParallelism: false,
        },
      },
    ],
  },
});
