import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

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
