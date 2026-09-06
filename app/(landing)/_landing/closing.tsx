import Link from "next/link";
import { BTN } from "./nav";
import { Reveal } from "./reveal";

export function Closing() {
  return (
    <Reveal className="-mx-8 mt-24 border-t border-rule px-8 pb-[110px] pt-[120px] text-center">
      <h2 className="mb-[30px] text-[34px] font-medium leading-[1.1] tracking-[-0.025em] md:text-[48px]">
        Analytics without the tracking.
        <br />
        <span className="text-mute">Always free.</span>
      </h2>
      <Link href="/sign-up" className={BTN}>
        Start free
      </Link>
    </Reveal>
  );
}

export function LandingFooter() {
  return (
    <footer className="flex items-center gap-8 border-t border-rule pb-10 pt-5 text-[13px] text-ink-2">
      <span className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.14em] text-ink">
        <span
          aria-hidden
          className="inline-block h-[10px] w-[10px] rounded-[3px] bg-teal"
        />
        LYNQ
      </span>
      <div className="flex gap-5">
        <a
          href="https://docs-lynq.byharsh.com"
          target="_blank"
          rel="noreferrer"
          className="hover:text-ink"
        >
          Docs
        </a>
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
      </div>
      <span className="ml-auto text-mute">© 2026 Lynq</span>
    </footer>
  );
}
