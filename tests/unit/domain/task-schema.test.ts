import { describe, expect, it } from "vitest";
import { createTaskSchema, patchTaskSchema } from "../../../src/domain/task-schema.js";

const base = {
  title: "Comprar material",
};

describe("createTaskSchema", () => {
  it("E sem deadline é inválido", () => {
    const result = createTaskSchema.safeParse({ ...base, type: "E" });
    expect(result.success).toBe(false);
  });

  it("M sem deadline é inválido", () => {
    const result = createTaskSchema.safeParse({ ...base, type: "M" });
    expect(result.success).toBe(false);
  });

  it("S sem deadline é válido", () => {
    const result = createTaskSchema.safeParse({ ...base, type: "S" });
    expect(result.success).toBe(true);
  });

  it("S com deadline é válido", () => {
    const result = createTaskSchema.safeParse({
      ...base,
      type: "S",
      deadline: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("E com deadline no passado é válido (tarefa atrasada é estado legítimo)", () => {
    const result = createTaskSchema.safeParse({
      ...base,
      type: "E",
      deadline: "2000-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("M com deadline no passado é válido", () => {
    const result = createTaskSchema.safeParse({
      ...base,
      type: "M",
      deadline: "2000-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("title vazio é inválido", () => {
    const result = createTaskSchema.safeParse({ ...base, title: "", type: "S" });
    expect(result.success).toBe(false);
  });

  it("title com mais de 200 chars é inválido", () => {
    const result = createTaskSchema.safeParse({
      ...base,
      title: "a".repeat(201),
      type: "S",
    });
    expect(result.success).toBe(false);
  });

  it("title com exatamente 200 chars é válido", () => {
    const result = createTaskSchema.safeParse({
      ...base,
      title: "a".repeat(200),
      type: "S",
    });
    expect(result.success).toBe(true);
  });

  it("type fora do enum é inválido", () => {
    const result = createTaskSchema.safeParse({ ...base, type: "X" });
    expect(result.success).toBe(false);
  });

  it("budget negativo é inválido", () => {
    const result = createTaskSchema.safeParse({ ...base, type: "S", budget: -1 });
    expect(result.success).toBe(false);
  });

  it("budget positivo é válido", () => {
    const result = createTaskSchema.safeParse({ ...base, type: "S", budget: 100.5 });
    expect(result.success).toBe(true);
  });

  it("status default é open quando ausente na criação", () => {
    const result = createTaskSchema.parse({ ...base, type: "S" });
    expect(result.status).toBe("open");
  });
});

describe("patchTaskSchema", () => {
  it("troca de type S para M sem deadline presente/fornecido é inválida", () => {
    const result = patchTaskSchema.safeParse({ type: "M" });
    expect(result.success).toBe(false);
  });

  it("troca de type S para M com deadline fornecido é válida", () => {
    const result = patchTaskSchema.safeParse({
      type: "M",
      deadline: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("troca de type para E sem deadline é inválida", () => {
    const result = patchTaskSchema.safeParse({ type: "E" });
    expect(result.success).toBe(false);
  });

  it("patch parcial sem type nem deadline é válido (ex: só status)", () => {
    const result = patchTaskSchema.safeParse({ status: "done" });
    expect(result.success).toBe(true);
  });
});
