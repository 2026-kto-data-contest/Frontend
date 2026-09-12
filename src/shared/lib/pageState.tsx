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
