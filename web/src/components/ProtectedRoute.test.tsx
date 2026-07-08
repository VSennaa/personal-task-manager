import { describe, expect, it, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { clearToken, saveToken } from "../lib/auth";

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={["/tarefas"]}>
      <Routes>
        <Route path="/login" element={<div>tela de login</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/tarefas" element={<div>tela protegida</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  afterEach(() => {
    clearToken();
  });

  it("redireciona para /login quando não há token", () => {
    renderWithRoute();
    expect(screen.getByText("tela de login")).toBeInTheDocument();
  });

  it("renderiza a rota protegida quando há token", () => {
    saveToken("token-valido");
    renderWithRoute();
    expect(screen.getByText("tela protegida")).toBeInTheDocument();
  });
});
