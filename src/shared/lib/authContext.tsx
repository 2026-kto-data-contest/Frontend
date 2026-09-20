import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { fetchMe, logoutApi, redirectToKakaoLogout } from "../api/api";
import type { Member } from "../api/api";
import { invalidateTabCache } from "./pageState";

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
      setMember(null);
      // 다른 계정으로 다시 로그인했을 때 이전 계정의 캐시된 탭 데이터가 잠깐이라도
      // 보이지 않도록, 로그아웃 시점에 탭별 캐시를 전부 무효화합니다.
      invalidateTabCache();
      // 우리 서버 로그아웃이 성공했을 때만 카카오 자체 로그인 세션도 끊습니다(먼저 우리
      // 세션을 확실히 지운 뒤에만 진행). 카카오 로그인 REST 앱 키가 준비되면 전체 페이지
      // 이동으로 카카오 로그아웃 주소를 거쳐 로그인 화면으로 돌아가고, 키가 아직 없으면
      // false를 반환해 아무 것도 하지 않고 호출한 쪽이 원래대로 다음 화면으로 이동합니다.
      redirectToKakaoLogout();
    } catch (error) {
      console.error("로그아웃 요청 실패", error);
      setMember(null);
      invalidateTabCache();
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
