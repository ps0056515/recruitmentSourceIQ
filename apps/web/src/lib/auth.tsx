import type { ReactNode } from "react";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { UserRole } from "@sourceiq/shared";
import { Navigate } from "react-router-dom";
import api, { getToken, setToken } from "./api";

type User = { id: string; email: string; role: UserRole };

type AuthState = {
  user: User | null;
  booting: boolean;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setBooting(false);
      return;
    }
    api("/auth/me")
      .then((u) => setUser(u as User))
      .catch(() => setToken(null))
      .finally(() => setBooting(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      booting,
      loading,
      login: async (email, password, role) => {
        setLoading(true);
        try {
          const data = await api(`/auth/login`, {
            method: "POST",
            body: JSON.stringify({ email, password, role }),
          });
          setToken(data.token);
          setUser(data.user);
        } finally {
          setLoading(false);
        }
      },
      logout: () => {
        setToken(null);
        setUser(null);
      },
    }),
    [user, booting, loading],
  );

  if (booting) {
    return (
      <div className="flex min-h-full items-center justify-center bg-sand">
        <p className="text-sm text-ink-muted">Loading workspace…</p>
      </div>
    );
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth requires AuthProvider");
  return v;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
