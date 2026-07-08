import { describe, expect, it } from "vitest";
import { formatDeadline } from "./format.js";

describe("formatDeadline", () => {
  it("retorna 'atrasada' para deadline no passado", () => {
    const now = new Date("2026-01-10T12:00:00.000Z");
    expect(formatDeadline("2026-01-01T00:00:00.000Z", now)).toBe("atrasada");
  });

  it("retorna 'faltam Xd Yh' para deadline futuro", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(formatDeadline("2026-01-03T04:00:00.000Z", now)).toBe("faltam 2d 4h");
  });

  it("retorna null quando não há deadline", () => {
    expect(formatDeadline(null)).toBeNull();
  });
});
