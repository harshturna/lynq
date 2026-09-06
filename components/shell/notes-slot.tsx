import Link from "next/link";
import type { ReactNode } from "react";

/** A chart section's right slot: how many notes are in the range, and the add control. */
export function NotesSlot({
  slug,
  count,
  form,
}: {
  slug: string;
  count: number;
  form: ReactNode;
}) {
  return (
    <>
      {count > 0 && (
        <Link
          href={`/${slug}/settings#notes`}
          className="hover:text-ink"
          aria-label={`${count} ${count === 1 ? "note" : "notes"} in this range, listed in settings`}
        >
          {count} {count === 1 ? "note" : "notes"}
        </Link>
      )}
      {form}
    </>
  );
}
