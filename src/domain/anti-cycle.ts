export interface SubtaskRecord {
  id: string;
  taskId: string;
  parentId: string | null;
}

function isDescendant(records: SubtaskRecord[], ancestorId: string, candidateId: string): boolean {
  const byParent = new Map<string, SubtaskRecord[]>();
  for (const record of records) {
    if (record.parentId === null) continue;
    const siblings = byParent.get(record.parentId) ?? [];
    siblings.push(record);
    byParent.set(record.parentId, siblings);
  }

  const stack = [...(byParent.get(ancestorId) ?? [])];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (node.id === candidateId) return true;
    stack.push(...(byParent.get(node.id) ?? []));
  }
  return false;
}

export function canMoveSubtask(
  records: SubtaskRecord[],
  subtaskId: string,
  newParentId: string | null,
): boolean {
  if (newParentId === subtaskId) return false;

  if (newParentId === null) return true;

  const subtask = records.find((r) => r.id === subtaskId);
  const newParent = records.find((r) => r.id === newParentId);
  if (!subtask || !newParent) return false;

  if (subtask.taskId !== newParent.taskId) return false;

  if (isDescendant(records, subtaskId, newParentId)) return false;

  return true;
}
