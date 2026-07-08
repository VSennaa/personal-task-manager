import { describe, expect, it } from "vitest";
import { sortTasks, type TaskForSort } from "../../../src/domain/sort-tasks.js";

function task(overrides: Partial<TaskForSort> & { id: string }): TaskForSort {
  return {
    type: "S",
    status: "open",
    deadline: null,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("sortTasks", () => {
  it("E antes de M antes de S, independentemente de datas de criação", () => {
    const s = task({ id: "s", type: "S", createdAt: "2020-01-01T00:00:00.000Z" });
    const m = task({
      id: "m",
      type: "M",
      deadline: "2030-01-01T00:00:00.000Z",
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    const e = task({
      id: "e",
      type: "E",
      deadline: "2030-01-01T00:00:00.000Z",
      createdAt: "2028-01-01T00:00:00.000Z",
    });

    const result = sortTasks([s, m, e]);
    expect(result.map((t) => t.id)).toEqual(["e", "m", "s"]);
  });

  it("entre E: deadline mais próximo primeiro; empate por created_at crescente", () => {
    const eLate = task({
      id: "e-late",
      type: "E",
      deadline: "2030-06-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const eEarly = task({
      id: "e-early",
      type: "E",
      deadline: "2030-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const eTieOlder = task({
      id: "e-tie-older",
      type: "E",
      deadline: "2030-01-01T00:00:00.000Z",
      createdAt: "2025-01-01T00:00:00.000Z",
    });

    const result = sortTasks([eLate, eEarly, eTieOlder]);
    expect(result.map((t) => t.id)).toEqual(["e-tie-older", "e-early", "e-late"]);
  });

  it("entre M: deadline mais próximo primeiro; empate por created_at crescente", () => {
    const mLate = task({
      id: "m-late",
      type: "M",
      deadline: "2030-06-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const mEarly = task({
      id: "m-early",
      type: "M",
      deadline: "2030-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const mTieOlder = task({
      id: "m-tie-older",
      type: "M",
      deadline: "2030-01-01T00:00:00.000Z",
      createdAt: "2025-01-01T00:00:00.000Z",
    });

    const result = sortTasks([mLate, mEarly, mTieOlder]);
    expect(result.map((t) => t.id)).toEqual(["m-tie-older", "m-early", "m-late"]);
  });

  it("entre S: sort_order crescente; empate por created_at crescente", () => {
    const s2 = task({ id: "s2", sortOrder: 2, createdAt: "2026-01-01T00:00:00.000Z" });
    const s1 = task({ id: "s1", sortOrder: 1, createdAt: "2026-01-01T00:00:00.000Z" });
    const s1Older = task({ id: "s1-older", sortOrder: 1, createdAt: "2025-01-01T00:00:00.000Z" });

    const result = sortTasks([s2, s1, s1Older]);
    expect(result.map((t) => t.id)).toEqual(["s1-older", "s1", "s2"]);
  });

  it("done/cancelled são excluídas da listagem padrão", () => {
    const open = task({ id: "open", status: "open" });
    const done = task({ id: "done", status: "done" });
    const cancelled = task({ id: "cancelled", status: "cancelled" });

    const result = sortTasks([open, done, cancelled]);
    expect(result.map((t) => t.id)).toEqual(["open"]);
  });

  it("in_progress é incluída (equiparada a open para ordenação)", () => {
    const open = task({ id: "open", status: "open", sortOrder: 1 });
    const inProgress = task({ id: "in-progress", status: "in_progress", sortOrder: 0 });

    const result = sortTasks([open, inProgress]);
    expect(result.map((t) => t.id)).toEqual(["in-progress", "open"]);
  });

  it("lista vazia retorna lista vazia sem erro", () => {
    expect(sortTasks([])).toEqual([]);
  });
});
