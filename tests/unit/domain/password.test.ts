import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../../src/domain/password.js";

describe("password hashing (Argon2id)", () => {
  it("gera um hash Argon2id diferente do texto original", async () => {
    const hash = await hashPassword("minha-senha-forte");
    expect(hash).not.toBe("minha-senha-forte");
    expect(hash).toContain("$argon2id$");
  });

  it("verifica corretamente a senha certa", async () => {
    const hash = await hashPassword("minha-senha-forte");
    await expect(verifyPassword(hash, "minha-senha-forte")).resolves.toBe(true);
  });

  it("rejeita a senha errada", async () => {
    const hash = await hashPassword("minha-senha-forte");
    await expect(verifyPassword(hash, "senha-errada")).resolves.toBe(false);
  });

  it("gera hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const hash1 = await hashPassword("mesma-senha");
    const hash2 = await hashPassword("mesma-senha");
    expect(hash1).not.toBe(hash2);
  });
});
