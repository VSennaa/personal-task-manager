export interface FlatSubtask {
  id: string;
  taskId: string;
  parentId: string | null;
  title: string;
  isDone: boolean;
  notes: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubtaskTreeNode extends FlatSubtask {
  children: SubtaskTreeNode[];
}

export function buildSubtaskTree(flat: FlatSubtask[]): SubtaskTreeNode[] {
  const byParent = new Map<string | null, FlatSubtask[]>();
  for (const item of flat) {
    const siblings = byParent.get(item.parentId) ?? [];
    siblings.push(item);
    byParent.set(item.parentId, siblings);
  }

  function build(parentId: string | null): SubtaskTreeNode[] {
    const children = byParent.get(parentId) ?? [];
    return children
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime())
      .map((item) => ({ ...item, children: build(item.id) }));
  }

  return build(null);
}

export function toProgressNodes(
  tree: SubtaskTreeNode[],
): { id: string; isDone: boolean; children: ReturnType<typeof toProgressNodes> }[] {
  return tree.map((node) => ({
    id: node.id,
    isDone: node.isDone,
    children: toProgressNodes(node.children),
  }));
}
