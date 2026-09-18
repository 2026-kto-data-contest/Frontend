import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface NavbarVisibilityStore {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
}

const NavbarVisibilityContext = createContext<NavbarVisibilityStore | null>(null);

export function NavbarVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  return (
    <NavbarVisibilityContext.Provider value={{ hidden, setHidden }}>
      {children}
    </NavbarVisibilityContext.Provider>
  );
}

export function useNavbarVisibility() {
  const ctx = useContext(NavbarVisibilityContext);
  if (!ctx) throw new Error("useNavbarVisibility must be used within NavbarVisibilityProvider");
  return ctx;
}

// 지도 화면의 위치 동의 시트·장소 상세 카드처럼, 전체 화면을 덮는 오버레이가 떠 있는 동안만
// 하단 네비게이션 바를 숨깁니다. 조건이 다시 꺼지면 자동으로 복원됩니다.
export function useHideNavbar(hidden: boolean) {
  const { setHidden } = useNavbarVisibility();
  useEffect(() => {
    if (!hidden) return;
    setHidden(true);
    return () => setHidden(false);
  }, [hidden, setHidden]);
}
