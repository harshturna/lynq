"use client";

import * as Popover from "@radix-ui/react-popover";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { NOTE_TEXT_MAX } from "@/lib/notes/validate";
import { createNote, deleteNote, updateNote } from "@/lib/screens/note-actions";

const FIELD =
  "h-8 w-full rounded-control border border-rule bg-canvas px-2 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal";

export type NoteDraft = { id: number; at: string; text: string };

/** The instant as the datetime-local input wants it, in the site's zone. */
function localValue(iso: string, tz: string): string {
  return formatInTimeZone(new Date(iso), tz, "yyyy-MM-dd'T'HH:mm");
}

/**
 * The note popover (docs/design/notes-on-charts.md §5): a date and time in
 * the site's timezone, defaulting to now, and one sentence. Creates from a
 * chart's section, edits from Settings → Notes; the goal form's pattern.
 */
export function NoteForm({
  slug,
  timezone,
  isGuest,
  note,
  trigger,
  align = "end",
}: {
  slug: string;
  timezone: string;
  isGuest: boolean;
  /** Editing an existing note, or creating when absent. */
  note?: NoteDraft;
  trigger: ReactNode;
  align?: "start" | "end";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(note?.text ?? "");
  const [at, setAt] = useState(() =>
    localValue(note?.at ?? new Date().toISOString(), timezone)
  );
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const reset = () => {
    setText(note?.text ?? "");
    setAt(localValue(note?.at ?? new Date().toISOString(), timezone));
    setError("");
    setConfirm(false);
  };
  const submit = () =>
    start(async () => {
      setError("");
      const instant = at ? fromZonedTime(at, timezone).toISOString() : null;
      const res = note
        ? await updateNote(slug, note.id, { text, at: instant })
        : await createNote(slug, { text, at: instant });
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  const remove = () =>
    start(async () => {
      if (!note) return;
      const res = await deleteNote(slug, note.id);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset();
      }}
    >
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          className="z-50 w-[320px] rounded-control border border-rule bg-canvas p-4 text-[13px] shadow-[0_8px_24px_-12px_rgba(10,10,10,0.25)]"
        >
          {isGuest ? (
            <p className="text-mute">The guest account cannot change notes.</p>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label className="flex flex-col gap-1">
                <span className="text-[11.5px] text-mute">Note</span>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Deployed v2"
                  maxLength={NOTE_TEXT_MAX}
                  required
                  // biome-ignore lint/a11y/noAutofocus: the popover opened for this field; the goal form does the same
                  autoFocus
                  onFocus={(e) => {
                    // an edit opens with the caret at the end and the start scrolled away
                    if (note) e.currentTarget.setSelectionRange(0, 0);
                  }}
                  className={FIELD}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11.5px] text-mute">
                  When · {timezone}
                </span>
                <input
                  type="datetime-local"
                  value={at}
                  onChange={(e) => setAt(e.target.value)}
                  required
                  className={FIELD}
                />
              </label>
              {error && (
                <p role="alert" className="text-[12.5px] text-poor">
                  {error}
                </p>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={pending || !text.trim()}
                  className="h-8 rounded-control bg-ink px-3 text-[13px] font-medium text-canvas disabled:bg-soft disabled:text-mute"
                >
                  {note ? "Save note" : "Add note"}
                </button>
                {note &&
                  (confirm ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={remove}
                      className="text-[12.5px] text-poor hover:underline"
                    >
                      Delete for good
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirm(true)}
                      className="text-[12.5px] text-mute hover:text-ink"
                    >
                      Delete
                    </button>
                  ))}
              </div>
            </form>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
