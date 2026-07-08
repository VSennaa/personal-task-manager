export type TaskType = "E" | "M" | "S";
export type TaskStatus = "open" | "in_progress" | "done" | "cancelled";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  deadline: string | null;
  budget: number | null;
  status: TaskStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  parentId: string | null;
  title: string;
  isDone: boolean;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
