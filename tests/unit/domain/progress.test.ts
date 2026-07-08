import { describe, expect, it } from "vitest";
import { calculateProgress, type SubtaskNode } from "../../../src/domain/progress.js";

describe("calculateProgress", () => {
  it("task sem subtarefas, status != done -> 0%", () => {
    const result = calculateProgress([], "open");
    expect(result).toEqual({ totalLeaves: 0, doneLeaves: 0, percent: 0 });
  });

  it("task sem subtarefas, status done -> 100%", () => {
    const result = calculateProgress([], "done");
    expect(result).toEqual({ totalLeaves: 0, doneLeaves: 0, percent: 100 });
  });

  it("3 folhas planas, 1 done -> 33.3%", () => {
    const tree: SubtaskNode[] = [
      { id: "a", isDone: true, children: [] },
      { id: "b", isDone: false, children: [] },
      { id: "c", isDone: false, children: [] },
    ];
    const result = calculateProgress(tree, "open");
    expect(result).toEqual({ totalLeaves: 3, doneLeaves: 1, percent: 33.3 });
  });

  it("árvore do exemplo da spec: A done; B -> B1 done, B2 aberta -> 2/3", () => {
    const tree: SubtaskNode[] = [
      { id: "a", isDone: true, children: [] },
      {
        id: "b",
        isDone: false,
        children: [
          { id: "b1", isDone: true, children: [] },
          { id: "b2", isDone: false, children: [] },
        ],
      },
    ];
    const result = calculateProgress(tree, "open");
    expect(result.totalLeaves).toBe(3);
    expect(result.doneLeaves).toBe(2);
    expect(result.percent).toBeCloseTo(66.7, 1);
  });

  it("aninhamento profundo (5+ níveis) com folhas espalhadas conta só folhas", () => {
    const tree: SubtaskNode[] = [
      {
        id: "l1",
        isDone: false,
        children: [
          {
            id: "l2",
            isDone: false,
            children: [
              {
                id: "l3",
                isDone: false,
                children: [
                  {
                    id: "l4",
                    isDone: false,
                    children: [
                      { id: "l5-a", isDone: true, children: [] },
                      { id: "l5-b", isDone: false, children: [] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { id: "top-leaf", isDone: true, children: [] },
    ];
    const result = calculateProgress(tree, "open");
    expect(result.totalLeaves).toBe(3);
    expect(result.doneLeaves).toBe(2);
  });

  it("nó intermediário com is_done=true mas filhos abertos não afeta o cálculo", () => {
    const tree: SubtaskNode[] = [
      {
        id: "parent",
        isDone: true,
        children: [
          { id: "child1", isDone: false, children: [] },
          { id: "child2", isDone: false, children: [] },
        ],
      },
    ];
    const result = calculateProgress(tree, "open");
    expect(result).toEqual({ totalLeaves: 2, doneLeaves: 0, percent: 0 });
  });

  it("todas as folhas done -> 100%", () => {
    const tree: SubtaskNode[] = [
      { id: "a", isDone: true, children: [] },
      { id: "b", isDone: true, children: [{ id: "b1", isDone: true, children: [] }] },
    ];
    const result = calculateProgress(tree, "open");
    expect(result).toEqual({ totalLeaves: 2, doneLeaves: 2, percent: 100 });
  });

  it("retorna estrutura { totalLeaves, doneLeaves, percent }", () => {
    const result = calculateProgress([{ id: "a", isDone: false, children: [] }], "open");
    expect(result).toHaveProperty("totalLeaves");
    expect(result).toHaveProperty("doneLeaves");
    expect(result).toHaveProperty("percent");
  });
});
