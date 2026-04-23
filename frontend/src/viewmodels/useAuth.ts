import { useCallback, useEffect, useState } from "react";
import { authApi } from "../services/apiClient";
import type { DemoUser, User } from "../models/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("auth_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authApi.getDemoUsers().then(setDemoUsers).catch(() => {});
  }, []);

  const login = useCallback(async (username: string) => {
    setLoading(true);
    setError(null);
    try {
      const loggedUser = await authApi.login(username, "1234");
      localStorage.setItem("auth_user", JSON.stringify(loggedUser));
      setUser(loggedUser);
    } catch {
      setError("Error al iniciar sesión. Verifica que la API esté corriendo.");
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_user");
    setUser(null);
  }, []);

  return { user, demoUsers, loading, error, login, logout };
}
