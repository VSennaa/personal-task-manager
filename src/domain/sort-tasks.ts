export interface TaskForSort {
  id: string;
  type: "E" | "M" | "S";
  status: "open" | "in_progress" | "done" | "cancelled";
  deadline: string | null;
  sortOrder: number;
  createdAt: string;
}

const TYPE_RANK: Record<TaskForSort["type"], number> = { E: 0, M: 1, S: 2 };

const VISIBLE_STATUSES: ReadonlySet<TaskForSort["status"]> = new Set(["open", "in_progress"]);

export function sortTasks<T extends TaskForSort>(tasks: T[]): T[] {
  return tasks
    .filter((task) => VISIBLE_STATUSES.has(task.status))
    .slice()
    .sort((a, b) => {
      const typeDiff = TYPE_RANK[a.type] - TYPE_RANK[b.type];
      if (typeDiff !== 0) return typeDiff;

      if (a.type === "S") {
        const sortOrderDiff = a.sortOrder - b.sortOrder;
        if (sortOrderDiff !== 0) return sortOrderDiff;
        return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      }

      const deadlineDiff = Date.parse(a.deadline ?? "") - Date.parse(b.deadline ?? "");
      if (deadlineDiff !== 0) return deadlineDiff;
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    });
}
