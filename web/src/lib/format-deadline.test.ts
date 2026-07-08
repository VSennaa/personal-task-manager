import { describe, expect, it } from "vitest";
import { formatDeadline } from "./format-deadline";

describe("formatDeadline", () => {
  it("retorna 'atrasada' para deadline no passado", () => {
    const now = new Date("2026-01-10T12:00:00.000Z");
    const deadline = "2026-01-01T00:00:00.000Z";
    expect(formatDeadline(deadline, now)).toBe("atrasada");
  });

  it("retorna 'faltam Xd Yh' para deadline futuro em dias e horas", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const deadline = "2026-01-03T04:00:00.000Z";
    expect(formatDeadline(deadline, now)).toBe("faltam 2d 4h");
  });

  it("retorna 'faltam Xh' quando faltam apenas horas (menos de 1 dia)", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const deadline = "2026-01-01T05:00:00.000Z";
    expect(formatDeadline(deadline, now)).toBe("faltam 5h");
  });

  it("retorna 'faltam <1h' quando faltam menos de 1 hora", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const deadline = "2026-01-01T00:30:00.000Z";
    expect(formatDeadline(deadline, now)).toBe("faltam <1h");
  });

  it("retorna null quando não há deadline", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(formatDeadline(null, now)).toBeNull();
  });
});
