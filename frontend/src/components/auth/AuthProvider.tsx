"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { hasAuthSession, logout as authLogout } from "@/src/lib/auth";

type AuthContextValue = {
  /** Synced from localStorage after mount — avoids SSR/client hydration mismatch */
  isReady: boolean;
  isAuthenticated: boolean;
  refreshAuthState: () => void;
  markAuthenticated: () => void;
  logout: (reason?: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setIsAuthenticated(hasAuthSession());
      setIsReady(true);
    });
  }, []);

  const refreshAuthState = useCallback(() => {
    setIsAuthenticated(hasAuthSession());
  }, []);

  const markAuthenticated = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback((reason: string = "manual_logout") => {
    setIsAuthenticated(false);
    authLogout(reason);
  }, []);

  const value = useMemo(
    () => ({
      isReady,
      isAuthenticated,
      refreshAuthState,
      markAuthenticated,
      logout,
    }),
    [isReady, isAuthenticated, refreshAuthState, markAuthenticated, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
