"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User, LoginResponse } from "@/types";

interface AuthState {
  user: User | null;
  isCommissioner: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isCommissioner: false,
    isLoading: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem("fedexpick4_auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState({
          user: parsed.user,
          isCommissioner: parsed.user?.is_commissioner ?? false,
          isLoading: false,
        });
      } catch {
        setState((s) => ({ ...s, isLoading: false }));
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = async (email: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data: LoginResponse = await res.json();

    if (data.success && data.user) {
      localStorage.setItem(
        "fedexpick4_auth",
        JSON.stringify({ user: data.user })
      );
      setState({
        user: data.user,
        isCommissioner: data.user.is_commissioner,
        isLoading: false,
      });
      return { success: true };
    }
    return { success: false, error: data.error };
  };

  const logout = () => {
    localStorage.removeItem("fedexpick4_auth");
    setState({ user: null, isCommissioner: false, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
