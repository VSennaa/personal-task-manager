export interface SubtaskNode {
  id: string;
  isDone: boolean;
  children: SubtaskNode[];
}

export interface ProgressResult {
  totalLeaves: number;
  doneLeaves: number;
  percent: number;
}

function collectLeaves(nodes: SubtaskNode[]): SubtaskNode[] {
  return nodes.flatMap((node) =>
    node.children.length === 0 ? [node] : collectLeaves(node.children),
  );
}

export function calculateProgress(tree: SubtaskNode[], taskStatus: string): ProgressResult {
  if (tree.length === 0) {
    return { totalLeaves: 0, doneLeaves: 0, percent: taskStatus === "done" ? 100 : 0 };
  }

  const leaves = collectLeaves(tree);
  const totalLeaves = leaves.length;
  const doneLeaves = leaves.filter((leaf) => leaf.isDone).length;
  const percent = Math.round((doneLeaves / totalLeaves) * 1000) / 10;

  return { totalLeaves, doneLeaves, percent };
}
