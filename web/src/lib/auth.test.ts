import { afterEach, describe, expect, it } from "vitest";
import { clearToken, getToken, isAuthenticated, saveToken } from "./auth";

describe("auth token storage", () => {
  afterEach(() => {
    clearToken();
  });

  it("saveToken salva o token", () => {
    saveToken("abc.def.ghi");
    expect(getToken()).toBe("abc.def.ghi");
  });

  it("isAuthenticated é false sem token", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("isAuthenticated é true com token salvo", () => {
    saveToken("abc.def.ghi");
    expect(isAuthenticated()).toBe(true);
  });

  it("logout (clearToken) limpa o storage", () => {
    saveToken("abc.def.ghi");
    clearToken();
    expect(getToken()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });
});
