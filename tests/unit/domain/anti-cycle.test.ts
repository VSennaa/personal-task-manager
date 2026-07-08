import { describe, expect, it } from "vitest";
import { canMoveSubtask, type SubtaskRecord } from "../../../src/domain/anti-cycle.js";

// Árvore:
// task-1
//   root1 (id: root1)
//     child1 (parent: root1)
//       grandchild1 (parent: child1)
//     sibling1 (parent: root1)
// task-2
//   otherRoot (id: otherRoot, task_id: task-2)
const records: SubtaskRecord[] = [
  { id: "root1", taskId: "task-1", parentId: null },
  { id: "child1", taskId: "task-1", parentId: "root1" },
  { id: "grandchild1", taskId: "task-1", parentId: "child1" },
  { id: "sibling1", taskId: "task-1", parentId: "root1" },
  { id: "otherRoot", taskId: "task-2", parentId: null },
];

describe("canMoveSubtask", () => {
  it("mover para o próprio id é rejeitado", () => {
    expect(canMoveSubtask(records, "child1", "child1")).toBe(false);
  });

  it("mover para um filho direto é rejeitado", () => {
    expect(canMoveSubtask(records, "root1", "child1")).toBe(false);
  });

  it("mover para um descendente profundo é rejeitado", () => {
    expect(canMoveSubtask(records, "root1", "grandchild1")).toBe(false);
  });

  it("mover para um irmão é aceito", () => {
    expect(canMoveSubtask(records, "child1", "sibling1")).toBe(true);
  });

  it("mover para a raiz (parent_id = null) é aceito", () => {
    expect(canMoveSubtask(records, "grandchild1", null)).toBe(true);
  });

  it("mover para nó de outra task é rejeitado", () => {
    expect(canMoveSubtask(records, "child1", "otherRoot")).toBe(false);
  });
});
