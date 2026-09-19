import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// 탭 화면들이 usePersistentState로 캐싱해둔 데이터 중, 화면 자체에 반영되지 않는 변경(예:
// 마이페이지에서 취향 항목만 개별 수정)이 일어났을 때 그 캐시를 무효화하기 위한 전역 카운터입니다.
// Context 밖(훅이 아닌 일반 함수)에서도 호출해야 해서 React 상태가 아니라 모듈 전역 값+구독자로 둡니다.
let cacheGeneration = 0;
const cacheGenerationListeners = new Set<() => void>();

export function invalidateTabCache() {
  cacheGeneration += 1;
  cacheGenerationListeners.forEach((listener) => listener());
}

export function useCacheGeneration() {
  const [generation, setGeneration] = useState(cacheGeneration);
  useEffect(() => {
    const listener = () => setGeneration(cacheGeneration);
    cacheGenerationListeners.add(listener);
    return () => {
      cacheGenerationListeners.delete(listener);
    };
  }, []);
  return generation;
}

interface PageStateStore {
  data: Record<string, unknown>;
  activeScrollContainer: { current: HTMLDivElement | null };
}

const PageStateContext = createContext<PageStateStore | null>(null);

export function PageStateProvider({ children }: { children: ReactNode }) {
  const store = useRef<PageStateStore>({
    data: {},
    activeScrollContainer: { current: null },
  }).current;
  return <PageStateContext.Provider value={store}>{children}</PageStateContext.Provider>;
}

function usePageStateStore() {
  const ctx = useContext(PageStateContext);
  if (!ctx) throw new Error("usePageStateStore must be used within PageStateProvider");
  return ctx;
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const store = usePageStateStore();
  const [state, setState] = useState<T>(() =>
    key in store.data ? (store.data[key] as T) : initialValue
  );

  const update = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        store.data[key] = next;
        return next;
      });
    },
    [key, store]
  );

  return [state, update] as const;
}

/**
 * usePersistentState와 달리 브라우저 localStorage에 저장해, 새로고침·재방문 후에도
 * 값이 남아있어야 하는 상태(예: 로그인 전 로컬 최근 검색어)에 씁니다.
 */
export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const update = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // 저장 공간이 없거나 접근이 막힌 환경에서는 조용히 무시합니다.
        }
        return next;
      });
    },
    [key]
  );

  return [state, update] as const;
}

/**
 * usePersistentState는 마운트 시점에 store 값을 한 번 읽어 React state로 고정하기 때문에,
 * "코스 모드처럼 같은 컴포넌트를 다른 초기값으로 다시 마운트해야 하는 경우"에는 쓰기 어렵습니다.
 * 이 훅은 값을 구독하지 않고 그때그때 직접 읽고/쓰는 저수준 접근을 제공합니다 — 예를 들어
 * 렌더 시점에 조건부로 초기값을 고를 때, 혹은 지도 중심처럼 리렌더가 필요 없는 값을 저장할 때 씁니다.
 */
export function usePageMemory() {
  const store = usePageStateStore();
  const get = useCallback(<T,>(key: string): T | undefined => store.data[key] as T | undefined, [
    store,
  ]);
  const set = useCallback(<T,>(key: string, value: T) => {
    store.data[key] = value;
  }, [store]);
  return { get, set };
}

export function useScrollRestoration(pathname: string) {
  const store = usePageStateStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    store.activeScrollContainer.current = el;
    el.scrollTop = (store.data[`scroll:${pathname}`] as number) ?? 0;
  }, [pathname, store]);

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    store.data[`scroll:${pathname}`] = el.scrollTop;
  }, [pathname, store]);

  return { ref, handleScroll };
}

export function useScrollToTop(pathname: string) {
  const store = usePageStateStore();
  return useCallback(() => {
    store.data[`scroll:${pathname}`] = 0;
    if (store.activeScrollContainer.current) {
      store.activeScrollContainer.current.scrollTop = 0;
    }
  }, [pathname, store]);
}

/**
 * 공유 링크 등으로 양조장·코스 상세 같은 페이지에 곧장 들어온 경우(이 앱 안에서 이동해온
 * 이전 화면이 없음)에는 navigate(-1)이 앱 밖(공유한 곳)으로 나가버리거나 아무 동작도 하지
 * 않을 수 있습니다. React Router는 앱 진입 후 아직 한 번도 push되지 않은 최초 위치의
 * location.key를 "default"로 표시하므로, 그 경우에만 홈으로 보내고 그 외에는 평소처럼
 * 뒤로 갑니다.
 */
export function useSmartBack() {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => {
    if (location.key === "default") {
      navigate("/", { replace: true });
    } else {
      navigate(-1);
    }
  }, [navigate, location.key]);
}
