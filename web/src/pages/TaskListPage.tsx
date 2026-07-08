import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../lib/api-client";
import { api } from "../lib/api";
import { clearToken } from "../lib/auth";
import { formatDeadline } from "../lib/format-deadline";
import type { Task, TaskType } from "../types";

export function TaskListPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("S");
  const [deadline, setDeadline] = useState("");

  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Task[]>("/tasks");
      setTasks(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.post("/tasks", {
        title,
        type,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
      setTitle("");
      setDeadline("");
      setType("S");
      await loadTasks();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "erro ao criar tarefa");
    }
  }

  function handleLogout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  const needsDeadline = type === "E" || type === "M";

  return (
    <div className="task-list-page">
      <header className="page-header">
        <h1>Tarefas</h1>
        <button type="button" onClick={handleLogout}>
          Sair
        </button>
      </header>

      <form className="quick-create" onSubmit={handleCreate}>
        <input
          placeholder="Nova tarefa..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <select value={type} onChange={(e) => setType(e.target.value as TaskType)}>
          <option value="E">Emergencial</option>
          <option value="M">Prazo definido</option>
          <option value="S">Longo prazo</option>
        </select>
        {needsDeadline && (
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        )}
        <button type="submit">Adicionar</button>
      </form>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <li key={task.id} className={`task-item task-item--${task.type}`}>
              <Link to={`/tasks/${task.id}`}>
                <span className="task-type-badge">{task.type}</span>
                <span className="task-title">{task.title}</span>
                {task.deadline && (
                  <span className="task-deadline">{formatDeadline(task.deadline)}</span>
                )}
              </Link>
            </li>
          ))}
          {tasks.length === 0 && <p>Nenhuma tarefa por aqui.</p>}
        </ul>
      )}
    </div>
  );
}
