import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { fetchMe, logoutApi } from "../api/api";
import type { Member } from "../api/api";

interface AuthContextValue {
  isLoading: boolean;
  isLoggedIn: boolean;
  hasOnboarded: boolean;
  termsAgreed: boolean;
  nickname: string;
  email: string;
  /** /auth/me를 다시 조회해 로그인·약관·온보딩 상태를 최신화합니다. */
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setMember(me);
    } catch (error) {
      // 네트워크 오류 등으로 조회에 실패하면 비로그인 상태로 취급합니다.
      console.error("회원 정보 조회 실패", error);
      setMember(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 앱 진입 시 최초 1회 조회입니다. 개발 모드(StrictMode)의 이중 실행으로 느린 백엔드에
  // 중복 요청이 몰리지 않도록, 정리 시점에 실제로 요청을 끊습니다(이후의 수동 refresh()는
  // 로그인/온보딩 흐름에서 명시적으로 호출되는 것이라 이 문제가 없어 그대로 둡니다).
  useEffect(() => {
    const controller = new AbortController();
    fetchMe(controller.signal)
      .then((me) => {
        setMember(me);
        setIsLoading(false);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("회원 정보 조회 실패", error);
        setMember(null);
        setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error("로그아웃 요청 실패", error);
    } finally {
      setMember(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isLoggedIn: !!member,
      hasOnboarded: member?.onboardingCompleted ?? false,
      termsAgreed: member?.termsAgreed ?? false,
      nickname: member?.nickname || "전통주로",
      email: member?.email || "",
      refresh,
      logout,
    }),
    [isLoading, member, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
