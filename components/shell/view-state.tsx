"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  parseSearch,
  searchParamsToInput,
  toQuery,
  type ViewState,
} from "@/lib/url-state";

export { searchParamsToInput };

/**
 * The URL is the state (design §5). `useViewState()` gives the parsed state and
 * an `update` that pushes the next URL through the router inside a transition,
 * so the server re-renders and `pending` can dim the affected region.
 * `useAnnounce()` queues one message for the page's single role="status" region,
 * spoken once the transition settles (design §6).
 */
type Update = (
  next: ViewState | ((current: ViewState) => ViewState),
  opts?: { replace?: boolean }
) => void;

type ViewStateValue = { state: ViewState; update: Update; pending: boolean };
type AnnounceValue = { announce: (message: string) => void };

const ViewStateContext = createContext<ViewStateValue | null>(null);
const AnnounceContext = createContext<AnnounceValue | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const state = useMemo(
    () => parseSearch(searchParamsToInput(searchParams)),
    [searchParams]
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  const update = useCallback<Update>(
    (next, opts) => {
      const resolved =
        typeof next === "function" ? next(stateRef.current) : next;
      const url = `${pathname}${toQuery(resolved)}`;
      startTransition(() => {
        if (opts?.replace) router.replace(url);
        else router.push(url);
      });
    },
    [pathname, router]
  );

  // Announcements wait for the transition so the message describes the new page.
  const [message, setMessage] = useState("");
  const queued = useRef<string | null>(null);
  const announce = useCallback((text: string) => {
    queued.current = text;
  }, []);
  useEffect(() => {
    if (pending || queued.current === null) return;
    const text = queued.current;
    queued.current = null;
    // Clear first so an identical message is announced again.
    setMessage("");
    const id = window.setTimeout(() => setMessage(text), 50);
    return () => window.clearTimeout(id);
  }, [pending]);

  const value = useMemo(
    () => ({ state, update, pending }),
    [state, update, pending]
  );
  const announceValue = useMemo(() => ({ announce }), [announce]);

  return (
    <ViewStateContext.Provider value={value}>
      <AnnounceContext.Provider value={announceValue}>
        {children}
        <div role="status" aria-live="polite" className="sr-only">
          {message}
        </div>
      </AnnounceContext.Provider>
    </ViewStateContext.Provider>
  );
}

export function useViewState(): ViewStateValue {
  const ctx = useContext(ViewStateContext);
  if (!ctx) throw new Error("useViewState must be used within ShellProvider");
  return ctx;
}

export function useAnnounce(): AnnounceValue["announce"] {
  const ctx = useContext(AnnounceContext);
  if (!ctx) throw new Error("useAnnounce must be used within ShellProvider");
  return ctx.announce;
}
