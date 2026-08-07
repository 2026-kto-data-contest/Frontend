import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface AuthState {
  isLoggedIn: boolean;
  hasOnboarded: boolean;
  nickname: string;
  preferredRegion: string;
  preferredType: string;
  preferredTag: string;
}

interface AuthContextValue extends AuthState {
  preferenceLabel: string;
  login: (nickname?: string) => void;
  completeOnboarding: () => void;
  logout: () => void;
}

const INITIAL_STATE: AuthState = {
  isLoggedIn: false,
  hasOnboarded: false,
  nickname: "전통주로",
  preferredRegion: "수도권",
  preferredType: "청주",
  preferredTag: "깔끔함",
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      preferenceLabel: `${state.preferredRegion}의 ${state.preferredTag} ${state.preferredType}`,
      login: (nickname) =>
        setState((prev) => ({ ...prev, isLoggedIn: true, nickname: nickname ?? prev.nickname })),
      completeOnboarding: () =>
        setState((prev) => ({ ...prev, isLoggedIn: true, hasOnboarded: true })),
      logout: () => setState(INITIAL_STATE),
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
