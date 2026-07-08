import { describe, expect, it } from "vitest";
import { buildTree, flattenTree, type FlatSubtask } from "./build-tree";

function flat(overrides: Partial<FlatSubtask> & { id: string }): FlatSubtask {
  return {
    parentId: null,
    title: "item",
    isDone: false,
    notes: null,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildTree", () => {
  it("monta árvore a partir de lista plana (pais antes ou depois dos filhos)", () => {
    const items = [
      flat({ id: "b", parentId: "a" }),
      flat({ id: "a", parentId: null }),
      flat({ id: "c", parentId: "b" }),
    ];

    const tree = buildTree(items);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe("a");
    expect(tree[0]!.children).toHaveLength(1);
    expect(tree[0]!.children[0]!.id).toBe("b");
    expect(tree[0]!.children[0]!.children[0]!.id).toBe("c");
  });

  it("ordena irmãos por sort_order, empate por created_at", () => {
    const items = [
      flat({ id: "second", sortOrder: 1, createdAt: "2026-01-01T00:00:00.000Z" }),
      flat({ id: "first", sortOrder: 0, createdAt: "2026-01-02T00:00:00.000Z" }),
      flat({ id: "tie-older", sortOrder: 0, createdAt: "2026-01-01T00:00:00.000Z" }),
    ];

    const tree = buildTree(items);
    expect(tree.map((n) => n.id)).toEqual(["tie-older", "first", "second"]);
  });

  it("marca depth e collapsed a partir do 4º nível (depth > 3)", () => {
    const items = [
      flat({ id: "l1", parentId: null }),
      flat({ id: "l2", parentId: "l1" }),
      flat({ id: "l3", parentId: "l2" }),
      flat({ id: "l4", parentId: "l3" }),
      flat({ id: "l5", parentId: "l4" }),
    ];

    const tree = buildTree(items);
    const l1 = tree[0]!;
    const l2 = l1.children[0]!;
    const l3 = l2.children[0]!;
    const l4 = l3.children[0]!;
    const l5 = l4.children[0]!;

    expect(l1.depth).toBe(1);
    expect(l1.collapsed).toBe(false);
    expect(l3.depth).toBe(3);
    expect(l3.collapsed).toBe(false);
    expect(l4.depth).toBe(4);
    expect(l4.collapsed).toBe(true);
    expect(l5.depth).toBe(5);
    expect(l5.collapsed).toBe(true);
  });

  it("lista vazia retorna árvore vazia", () => {
    expect(buildTree([])).toEqual([]);
  });

  it("flattenTree + buildTree reconstrói a mesma estrutura de uma árvore já aninhada", () => {
    const items = [
      flat({ id: "a", parentId: null }),
      flat({ id: "b", parentId: "a" }),
      flat({ id: "c", parentId: "b" }),
    ];
    const nested = buildTree(items);
    const roundTripped = buildTree(flattenTree(nested));

    expect(roundTripped[0]!.id).toBe("a");
    expect(roundTripped[0]!.children[0]!.id).toBe("b");
    expect(roundTripped[0]!.children[0]!.children[0]!.id).toBe("c");
  });
});
