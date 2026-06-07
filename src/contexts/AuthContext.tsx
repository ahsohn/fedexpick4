"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User, LoginResponse } from "@/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  isCommissioner: boolean;
  login: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem("fedexpick4_auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState({ user: parsed.user ?? null, isLoading: false });
      } catch {
        setState((s) => ({ ...s, isLoading: false }));
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = async (email: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      let data: LoginResponse;
      try {
        data = await res.json();
      } catch {
        return { success: false, error: "Unexpected server response. Please try again." };
      }

      if (data.success && data.user) {
        localStorage.setItem("fedexpick4_auth", JSON.stringify({ user: data.user }));
        setState({ user: data.user, isLoading: false });
        return { success: true };
      }
      return { success: false, error: data.error ?? "Login failed" };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logout = () => {
    localStorage.removeItem("fedexpick4_auth");
    setState({ user: null, isLoading: false });
  };

  // Derived at read time so it can never drift from `user`.
  const isCommissioner = state.user?.is_commissioner ?? false;

  return (
    <AuthContext.Provider value={{ ...state, isCommissioner, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
