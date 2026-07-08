import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TaskDetailPage } from "./TaskDetailPage";
import { clearToken, saveToken } from "../lib/auth";

const taskDetail = {
  id: "task-1",
  title: "Árvore de exemplo",
  description: null,
  type: "S",
  deadline: null,
  budget: null,
  status: "open",
  sortOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  subtasks: [
    {
      id: "a",
      taskId: "task-1",
      parentId: null,
      title: "A",
      isDone: false,
      notes: null,
      sortOrder: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      children: [],
    },
  ],
};

function mockFetchSequence() {
  const fetchMock = vi.fn();
  fetchMock.mockImplementation((url: string) => {
    if (url.endsWith("/progress")) {
      return Promise.resolve(
        new Response(JSON.stringify({ totalLeaves: 1, doneLeaves: 0, percent: 0 }), {
          status: 200,
        }),
      );
    }
    if (url.includes("/tasks/task-1")) {
      return Promise.resolve(new Response(JSON.stringify(taskDetail), { status: 200 }));
    }
    if (url.includes("/subtasks/a")) {
      return Promise.resolve(new Response(JSON.stringify({ id: "a", isDone: true }), { status: 200 }));
    }
    return Promise.resolve(new Response("not found", { status: 404 }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("TaskDetailPage", () => {
  beforeEach(() => {
    saveToken("token-valido");
  });

  afterEach(() => {
    clearToken();
    vi.unstubAllGlobals();
  });

  it("renderiza a barra de progresso e a checklist aninhada", async () => {
    mockFetchSequence();

    render(
      <MemoryRouter initialEntries={["/tasks/task-1"]}>
        <Routes>
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Árvore de exemplo")).toBeInTheDocument());
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("marca subtarefa como feita otimisticamente e atualiza o progresso", async () => {
    mockFetchSequence();

    render(
      <MemoryRouter initialEntries={["/tasks/task-1"]}>
        <Routes>
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("A")).toBeInTheDocument());

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    checkbox.click();

    await waitFor(() => expect(checkbox).toBeChecked());
  });
});
