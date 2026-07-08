import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../lib/api-client";
import { api } from "../lib/api";
import { buildTree, flattenTree } from "../lib/build-tree";
import { SubtaskTree } from "../components/SubtaskTree";
import { ProgressBar } from "../components/ProgressBar";
import type { Progress, TaskDetail } from "../types";

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [taskData, progressData] = await Promise.all([
        api.get<TaskDetail>(`/tasks/${id}`),
        api.get<Progress>(`/tasks/${id}/progress`),
      ]);
      setTask(taskData);
      setProgress(progressData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "erro ao carregar tarefa");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggleDone(subtaskId: string, isDone: boolean) {
    if (!task) return;

    const previous = task;
    const optimistic = markSubtaskDone(task, subtaskId, isDone);
    setTask(optimistic);

    try {
      await api.patch(`/subtasks/${subtaskId}`, { isDone });
      const progressData = await api.get<Progress>(`/tasks/${task.id}/progress`);
      setProgress(progressData);
    } catch {
      setTask(previous);
    }
  }

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (error || !task) {
    return (
      <div className="task-detail-page">
        <Link to="/">&larr; voltar</Link>
        <p className="form-error" role="alert">
          {error ?? "tarefa não encontrada"}
        </p>
      </div>
    );
  }

  const tree = buildTree(flattenTree(task.subtasks));

  return (
    <div className="task-detail-page">
      <Link to="/">&larr; voltar</Link>
      <h1>{task.title}</h1>
      {task.description && <p className="task-description">{task.description}</p>}

      {progress && <ProgressBar percent={progress.percent} />}

      <SubtaskTree nodes={tree} onToggleDone={handleToggleDone} />
    </div>
  );
}

function markSubtaskDone(task: TaskDetail, subtaskId: string, isDone: boolean): TaskDetail {
  function updateNodes(nodes: TaskDetail["subtasks"]): TaskDetail["subtasks"] {
    return nodes.map((node) =>
      node.id === subtaskId
        ? { ...node, isDone }
        : { ...node, children: updateNodes(node.children) },
    );
  }
  return { ...task, subtasks: updateNodes(task.subtasks) };
}
