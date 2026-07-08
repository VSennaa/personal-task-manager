export interface FlatSubtask {
  id: string;
  parentId: string | null;
  title: string;
  isDone: boolean;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface TreeNode extends FlatSubtask {
  depth: number;
  collapsed: boolean;
  children: TreeNode[];
}

const MAX_VISUAL_DEPTH = 3;

export function buildTree(flat: FlatSubtask[]): TreeNode[] {
  const byParent = new Map<string | null, FlatSubtask[]>();
  for (const item of flat) {
    const siblings = byParent.get(item.parentId) ?? [];
    siblings.push(item);
    byParent.set(item.parentId, siblings);
  }

  function build(parentId: string | null, depth: number): TreeNode[] {
    const siblings = byParent.get(parentId) ?? [];
    return siblings
      .slice()
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder || Date.parse(a.createdAt) - Date.parse(b.createdAt),
      )
      .map((item) => ({
        ...item,
        depth,
        collapsed: depth > MAX_VISUAL_DEPTH,
        children: build(item.id, depth + 1),
      }));
  }

  return build(null, 1);
}

interface NestedSubtask extends FlatSubtask {
  children: NestedSubtask[];
}

/** Achata uma árvore já aninhada (como a retornada pela API) de volta a uma lista plana. */
export function flattenTree(nodes: NestedSubtask[]): FlatSubtask[] {
  return nodes.flatMap(({ children, ...rest }) => [rest, ...flattenTree(children)]);
}
