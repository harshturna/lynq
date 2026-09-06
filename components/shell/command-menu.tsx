"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { withParam } from "@/lib/url-state";
import { cn } from "@/lib/utils";
import { filterSentence } from "./dimensions";
import { COMPARES } from "./range-picker";
import { PRESETS, rangeLabel } from "./ranges";
import { SECTIONS, type SiteSummary } from "./sections";
import { ShortcutSheet } from "./shortcuts";
import { useAnnounce, useViewState } from "./view-state";

/**
 * The command menu (TICKET-079): one keystroke to reach any screen, range,
 * comparison or filter of the current view. Every command calls the same
 * `update` the toolbars call, so a command is undone by the back button and
 * announced like any other change.
 *
 * ⌘K is a modified key, so WCAG 2.1.4 does not require it to be switchable,
 * and the visible ⌘K button in the nav is the discoverable path. The
 * per-site keyboard-shortcuts setting still turns it off, for people who
 * want no key bindings at all.
 */
export type Command = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  /** Extra words the query can match, never shown. */
  keywords?: string;
  run: () => void;
};

const RECENTS_KEY = "lynq_command_recents";
const RECENTS_MAX = 3;

function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x) => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function rememberRecent(id: string) {
  try {
    const next = [id, ...readRecents().filter((x) => x !== id)].slice(
      0,
      RECENTS_MAX
    );
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* a private window is not a reason to fail a command */
  }
}

/**
 * Every whitespace-separated word of the query must appear in the label or
 * the keywords. Predictable beats clever: a person typing "pag ent" should
 * find "Pages · Entry" and nothing else.
 */
export function matches(command: Command, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay =
    `${command.label} ${command.keywords ?? ""} ${command.group}`.toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

export function rank(command: Command, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const label = command.label.toLowerCase();
  if (label.startsWith(q)) return 0;
  const at = label.indexOf(q.split(/\s+/)[0] ?? "");
  return at === -1 ? 2 : 1;
}

export function CommandMenu({
  site,
  sites,
  enabled,
}: {
  site: SiteSummary;
  sites: SiteSummary[];
  /** The site's keyboard-shortcuts setting; the button works either way. */
  enabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const { state, update } = useViewState();
  const announce = useAnnounce();
  const router = useRouter();
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  /** A command that navigates should not pull focus back to the button. */
  const ranRef = useRef(false);

  const commands = useMemo<Command[]>(() => {
    const base = `/${site.slug}`;
    const go = (href: string) => () => router.push(href);
    const out: Command[] = [];
    for (const s of SECTIONS)
      out.push({
        id: `go:${s.key || "overview"}`,
        group: "Go to",
        label: s.label,
        keywords: "screen section navigate",
        run: go(s.key ? `${base}/${s.key}` : base),
      });
    out.push({
      id: "go:settings",
      group: "Go to",
      label: "Settings",
      keywords: "snippet exclusions retention timezone",
      run: go(`${base}/settings`),
    });
    out.push({
      id: "go:sites",
      group: "Go to",
      label: "All sites",
      keywords: "switch list",
      run: go("/sites"),
    });
    for (const s of sites)
      if (s.slug !== site.slug)
        out.push({
          id: `site:${s.slug}`,
          group: "Go to",
          label: s.name,
          hint: s.url,
          keywords: `site ${s.url}`,
          run: go(`/${s.slug}`),
        });

    for (const p of PRESETS)
      out.push({
        id: `range:${p.value}`,
        group: "Range",
        label: p.label,
        hint: state.range === p.value ? "current" : undefined,
        keywords: "date period range",
        run: () => {
          update(withParam(state, "range", p.value));
          announce(`Range ${rangeLabel(p.value)}.`);
        },
      });
    for (const c of COMPARES)
      out.push({
        id: `compare:${c.value}`,
        group: "Range",
        label:
          c.value === "none"
            ? "No comparison"
            : `Compare with ${c.label.toLowerCase()}`,
        hint: state.compare === c.value ? "current" : undefined,
        keywords: "compare previous year period",
        run: () => {
          update(withParam(state, "compare", c.value));
          announce(`Comparison: ${c.label}.`);
        },
      });

    if (state.filters.length) {
      out.push({
        id: "filter:clear",
        group: "Filters",
        label: "Clear all filters",
        keywords: "remove reset",
        run: () => {
          update({ ...state, filters: [] });
          announce("Cleared all filters.");
        },
      });
      for (const f of state.filters)
        for (const value of f.values) {
          const sentence = filterSentence(f.dimension, f.op, [value]);
          out.push({
            id: `filter:${f.dimension}:${f.op}:${value}`,
            group: "Filters",
            label: `Remove ${sentence}`,
            keywords: "filter chip",
            run: () => {
              const values = f.values.filter((v) => v !== value);
              update({
                ...state,
                filters: state.filters
                  .map((x) => (x === f ? { ...x, values } : x))
                  .filter((x) => x.values.length),
              });
              announce(`Removed ${sentence}.`);
            },
          });
        }
    }

    out.push({
      id: "action:copy",
      group: "Actions",
      label: "Copy link to this view",
      keywords: "share url address",
      run: async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          announce("Link copied.");
        } catch {
          announce("Could not copy the link.");
        }
      },
    });
    out.push({
      id: "help:shortcuts",
      group: "Help",
      label: "Keyboard shortcuts",
      hint: "?",
      keywords: "keys help",
      run: () => setHelp(true),
    });
    out.push({
      id: "help:docs",
      group: "Help",
      label: "Documentation",
      hint: "docs-lynq.byharsh.com",
      keywords: "docs guide install",
      run: () =>
        window.open("https://docs-lynq.byharsh.com", "_blank", "noopener"),
    });
    return out;
  }, [site, sites, state, update, announce, router]);

  const shown = useMemo(() => {
    const found = commands
      .filter((c) => matches(c, query))
      .sort((a, b) => rank(a, query) - rank(b, query));
    if (query.trim()) return found;
    // Recents first, and never twice: a list that repeats itself reads as a bug.
    const recent = recents
      .map((id) => found.find((c) => c.id === id))
      .filter((c): c is Command => Boolean(c))
      .map((c) => ({ ...c, group: "Recent" }));
    const ids = new Set(recent.map((c) => c.id));
    return [...recent, ...found.filter((c) => !ids.has(c.id))];
  }, [commands, query, recents]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled]);

  const start = useCallback(() => {
    setQuery("");
    setIndex(0);
    setRecents(readRecents());
    setOpen(true);
  }, []);

  const runAt = (i: number) => {
    const command = shown[i];
    if (!command) return;
    ranRef.current = true;
    setOpen(false);
    rememberRecent(command.id);
    command.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => {
        const next = e.key === "ArrowDown" ? i + 1 : i - 1;
        return next < 0 ? shown.length - 1 : next >= shown.length ? 0 : next;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      setIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setIndex(shown.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(index);
    }
  };

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={start}
        aria-keyshortcuts="Meta+K Control+K"
        className="hidden h-[30px] items-center rounded-control border border-rule px-[9px] text-[12.5px] text-mute hover:bg-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal md:inline-flex"
      >
        ⌘K
      </button>
      <Dialog.Root
        open={open}
        onOpenChange={(o) => (o ? start() : setOpen(false))}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim" />
          <Dialog.Content
            aria-label="Commands"
            className="fixed left-1/2 top-[14vh] z-50 w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-card border border-rule bg-canvas shadow-[0_8px_24px_-12px_rgba(10,10,10,0.35)] outline-none"
            onKeyDown={onKeyDown}
            onCloseAutoFocus={(e) => {
              // The button is not the Radix trigger (⌘K opens it too), so
              // focus is put back by hand when nothing was run.
              e.preventDefault();
              if (!ranRef.current) buttonRef.current?.focus();
              ranRef.current = false;
            }}
          >
            <Dialog.Title className="sr-only">Commands</Dialog.Title>
            <Dialog.Description className="sr-only">
              Type to search screens, ranges, filters and actions.
            </Dialog.Description>
            <input
              // biome-ignore lint/a11y/noAutofocus: a command menu that does not take the caret is useless
              autoFocus
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={
                shown[index] ? `${listId}-${index}` : undefined
              }
              aria-label="Type a command or search"
              placeholder="Type a command or search…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIndex(0);
              }}
              className="w-full border-rule border-b bg-canvas px-4 py-[13px] text-[14.5px] text-ink outline-none placeholder:text-faint"
            />
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Commands"
              className="max-h-[360px] overflow-auto py-[6px]"
            >
              {shown.length === 0 && (
                <p className="px-4 py-3 text-[13px] text-mute">
                  Nothing matches “{query}”.
                </p>
              )}
              {shown.map((c, i) => (
                <div key={c.id}>
                  {(i === 0 || shown[i - 1].group !== c.group) && (
                    <div className="px-4 pb-1 pt-[10px] text-[11px] uppercase tracking-[0.07em] text-mute">
                      {c.group}
                    </div>
                  )}
                  {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard selection is handled by the combobox input */}
                  {/* biome-ignore lint/a11y/useFocusableInteractive: an option in a combobox popup is reached with aria-activedescendant, never focused itself */}
                  <div
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === index}
                    onClick={() => runAt(i)}
                    onMouseMove={() => setIndex(i)}
                    className={cn(
                      "flex h-8 cursor-pointer items-center justify-between gap-4 px-4 text-[13.5px]",
                      i === index && "bg-teal-soft"
                    )}
                  >
                    <span className="truncate text-ink">{c.label}</span>
                    {c.hint && (
                      <span className="shrink-0 text-[12px] text-faint">
                        {c.hint}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ShortcutSheet open={help} onOpenChange={setHelp} />
    </>
  );
}
