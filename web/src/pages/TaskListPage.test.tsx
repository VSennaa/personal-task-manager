import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TaskListPage } from "./TaskListPage";
import { clearToken, saveToken } from "../lib/auth";

describe("TaskListPage", () => {
  beforeEach(() => {
    saveToken("token-valido");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    clearToken();
    vi.unstubAllGlobals();
  });

  it("renderiza as tarefas retornadas pela API já na ordem recebida (E, M, S)", async () => {
    const tasks = [
      { id: "1", title: "Emergência", type: "E", deadline: null, status: "open" },
      { id: "2", title: "Prazo médio", type: "M", deadline: null, status: "open" },
      { id: "3", title: "Longo prazo", type: "S", deadline: null, status: "open" },
    ];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(tasks), { status: 200 }),
    );

    render(
      <MemoryRouter>
        <TaskListPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Emergência")).toBeInTheDocument());

    const list = screen.getByRole("list");
    const links = within(list).getAllByRole("link");
    expect(links.map((el) => el.textContent)).toEqual(["EEmergência", "MPrazo médio", "SLongo prazo"]);
  });

  it("mostra mensagem quando a API falha, em vez de travar em 'Carregando...'", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "falhou" } }), {
        status: 500,
      }),
    );

    render(
      <MemoryRouter>
        <TaskListPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("falhou")).toBeInTheDocument());
    expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
  });
});
