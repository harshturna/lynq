import Link from "next/link";

/** The landing page's bar: wordmark, Docs, Log in, Start free (D-014). */
export function LandingNav() {
  return (
    <nav
      aria-label="Site"
      className="flex h-[60px] items-center gap-8 text-[13.5px] text-ink-2"
    >
      <Link
        href="/"
        className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.14em] text-ink"
      >
        <span
          aria-hidden
          className="inline-block h-[10px] w-[10px] rounded-[3px] bg-teal"
        />
        LYNQ
      </Link>
      <div className="flex gap-6">
        <a
          href="https://docs-lynq.byharsh.com"
          target="_blank"
          rel="noreferrer"
          className="hover:text-ink"
        >
          Docs
        </a>
      </div>
      <div className="ml-auto flex items-center gap-5">
        <Link href="/login" className="hover:text-ink">
          Log in
        </Link>
        <Link href="/sign-up" className={BTN}>
          Start free
        </Link>
      </div>
    </nav>
  );
}

export const BTN =
  "inline-flex h-9 items-center rounded-[6px] bg-teal px-4 text-[13.5px] font-medium text-white hover:bg-teal-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";
