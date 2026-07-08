import { createApiClient } from "./api-client";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

export const api = createApiClient({
  baseUrl: API_URL,
  onUnauthorized: () => {
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  },
});
