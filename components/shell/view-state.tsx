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
import { fmtInt } from "@/lib/format";
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
 * spoken once the transition settles (design §6). When the filters changed
 * across that transition the message gains the filter count and, where the
 * screen renders a `VisitorTotal`, the visitor total: "Removed Country is
 * Canada. 2 filters. 3,201 visitors."
 */
export const VISITOR_TOTAL_ATTR = "data-visitor-total";

function filterSignature(state: ViewState): string {
  return state.filters
    .map((f) => `${f.dimension}:${f.op}:${f.values.join("|")}`)
    .join("&");
}

/** The sentence plus the filter count and the visitor total, as design §6 words them. */
export function withFilterSummary(
  text: string,
  filters: ViewState["filters"],
  visitors: number | null
): string {
  const count = filters.reduce((n, f) => n + f.values.length, 0);
  const parts = [text];
  if (count > 0) parts.push(`${count} ${count === 1 ? "filter" : "filters"}.`);
  if (visitors !== null) parts.push(`${fmtInt(visitors)} visitors.`);
  return parts.join(" ");
}

function visitorTotalInPage(): number | null {
  const raw = document
    .querySelector(`[${VISITOR_TOTAL_ATTR}]`)
    ?.getAttribute(VISITOR_TOTAL_ATTR);
  const n = raw === null || raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(n) ? n : null;
}
type Update = (
  next: ViewState | ((current: ViewState) => ViewState),
  opts?: {
    replace?: boolean;
    /** An element id to focus once the transition settles; the server render replaces the header, so focus set before it is lost. */
    focus?: string;
  }
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

  const focusAfter = useRef<string | null>(null);
  const update = useCallback<Update>(
    (next, opts) => {
      const resolved =
        typeof next === "function" ? next(stateRef.current) : next;
      const url = `${pathname}${toQuery(resolved)}`;
      if (opts?.focus) focusAfter.current = opts.focus;
      startTransition(() => {
        if (opts?.replace) router.replace(url);
        else router.push(url);
      });
    },
    [pathname, router]
  );

  // Announcements wait for the transition so the message describes the new page.
  const [message, setMessage] = useState("");
  const queued = useRef<{ text: string; filters: string } | null>(null);
  const announce = useCallback((text: string) => {
    queued.current = { text, filters: filterSignature(stateRef.current) };
  }, []);
  useEffect(() => {
    if (pending) return;
    if (focusAfter.current) {
      document.getElementById(focusAfter.current)?.focus();
      focusAfter.current = null;
    }
    if (queued.current === null) return;
    const { text: sentence, filters } = queued.current;
    queued.current = null;
    const text =
      filters === filterSignature(stateRef.current)
        ? sentence
        : withFilterSummary(
            sentence,
            stateRef.current.filters,
            visitorTotalInPage()
          );
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
