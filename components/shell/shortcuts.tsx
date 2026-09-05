"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { Kbd } from "./control";

/**
 * Keyboard shortcuts scoped the way WCAG 2.1.4 requires (design §6): `[` and
 * `]` only while focus is inside the page's controls, `/` only when no text
 * field has focus, `?` opens this sheet, and a setting turns them all off.
 * Delete and Backspace on a chip are handled by the chip itself.
 */
const TEXT_FIELDS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function inTextField(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return Boolean(el && (TEXT_FIELDS.has(el.tagName) || el.isContentEditable));
}

export function useShortcuts({
  enabled,
  onRangeStep,
  onSearch,
  onHelp,
}: {
  enabled: boolean;
  onRangeStep?: (direction: -1 | 1) => void;
  onSearch?: () => void;
  onHelp?: () => void;
}) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "?" && !inTextField()) {
        e.preventDefault();
        onHelp?.();
      } else if (e.key === "/" && !inTextField() && onSearch) {
        e.preventDefault();
        onSearch();
      } else if ((e.key === "[" || e.key === "]") && onRangeStep) {
        const target = e.target as HTMLElement | null;
        if (!target?.closest("[data-shell-controls]") || inTextField()) return;
        e.preventDefault();
        onRangeStep(e.key === "[" ? -1 : 1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled, onRangeStep, onSearch, onHelp]);
}

const SHORTCUTS: [string, string][] = [
  ["[ and ]", "Previous or next period, while the controls have focus"],
  ["/", "Focus search, when no text field has focus"],
  ["Delete or Backspace", "Remove the focused filter chip"],
  ["Arrow keys", "Move between table rows, calendar days and chart marks"],
  ["Enter", "Select the focused row or mark"],
  ["F or Shift + Enter", "Filter by the focused row or mark"],
  ["Escape", "Close a drawer, popover or tooltip"],
  ["?", "This sheet"],
];

export function ShortcutSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[420px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-card border border-rule bg-canvas p-5 shadow-[0_8px_24px_-12px_rgba(10,10,10,0.35)] outline-none">
          <Dialog.Title className="text-[14px] font-medium text-ink">
            Keyboard shortcuts
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-[12.5px] text-mute">
            Turn them off in Settings › General if they get in the way.
          </Dialog.Description>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
            {SHORTCUTS.map(([key, what]) => (
              <div key={key} className="contents">
                <dt>
                  <Kbd>{key}</Kbd>
                </dt>
                <dd className="text-ink-2">{what}</dd>
              </div>
            ))}
          </dl>
          <Dialog.Close asChild>
            <button
              type="button"
              className="mt-5 h-[30px] rounded-control border border-rule px-[10px] text-[13px] text-ink hover:bg-soft"
            >
              Close
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Convenience: wires the sheet and the `?` key together. */
export function Shortcuts({
  enabled,
  onRangeStep,
  onSearch,
}: {
  enabled: boolean;
  onRangeStep?: (d: -1 | 1) => void;
  onSearch?: () => void;
}) {
  const [open, setOpen] = useState(false);
  useShortcuts({ enabled, onRangeStep, onSearch, onHelp: () => setOpen(true) });
  return <ShortcutSheet open={open} onOpenChange={setOpen} />;
}
