import { useState } from "react";
import type { TreeNode } from "../lib/build-tree";

interface SubtaskTreeProps {
  nodes: TreeNode[];
  onToggleDone: (id: string, isDone: boolean) => void;
}

export function SubtaskTree({ nodes, onToggleDone }: SubtaskTreeProps) {
  return (
    <ul className="subtask-tree">
      {nodes.map((node) => (
        <SubtaskTreeItem key={node.id} node={node} onToggleDone={onToggleDone} />
      ))}
    </ul>
  );
}

function SubtaskTreeItem({
  node,
  onToggleDone,
}: {
  node: TreeNode;
  onToggleDone: (id: string, isDone: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <li className="subtask-item" style={{ paddingLeft: `${Math.min(node.depth - 1, 3) * 16}px` }}>
      <label className="subtask-label">
        <input
          type="checkbox"
          checked={node.isDone}
          onChange={(e) => onToggleDone(node.id, e.target.checked)}
        />
        <span className={node.isDone ? "subtask-title done" : "subtask-title"}>{node.title}</span>
      </label>

      {hasChildren && !node.collapsed && (
        <SubtaskTree nodes={node.children} onToggleDone={onToggleDone} />
      )}

      {hasChildren && node.collapsed && !expanded && (
        <button type="button" className="subtask-expand" onClick={() => setExpanded(true)}>
          abrir subitens ({node.children.length})
        </button>
      )}

      {hasChildren && node.collapsed && expanded && (
        <SubtaskTree nodes={node.children} onToggleDone={onToggleDone} />
      )}
    </li>
  );
}
