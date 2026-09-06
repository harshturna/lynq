import Link from "next/link";
import type { DemoStats } from "@/lib/screens/landing";
import { LiveCount } from "./live-count";
import { BTN } from "./nav";

const FALLBACK_PAGES = [
  { path: "/", visitors: 4490 },
  { path: "/pricing", visitors: 2610 },
  { path: "/docs/getting-started", visitors: 1840 },
  { path: "/blog/launch", visitors: 1420 },
  { path: "/signup", visitors: 1102 },
];

/** The opening (D-014): the headline, the buttons, and the ranked Pages table with one row lifted. */
export function Hero({ demo }: { demo: DemoStats | null }) {
  const pages = demo?.topPages.length ? demo.topPages : FALLBACK_PAGES;
  const max = Math.max(1, ...pages.map((p) => p.visitors));
  return (
    <section className="relative grid items-center gap-14 py-[72px] pb-12 md:grid-cols-[minmax(0,1.25fr)_minmax(0,.75fr)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-[200px] -top-[60px] bottom-0 bg-[radial-gradient(50%_55%_at_30%_30%,rgba(15,118,110,.07),transparent_70%)]"
      />
      <div className="relative">
        <h1 className="max-w-[24ch] text-[40px] font-medium leading-[1.06] tracking-[-0.025em] md:text-[52px]">
          Analytics that respects
          <br />
          <Mark>your visitors</Mark>.
        </h1>
        <p className="mt-[22px] max-w-[52ch] text-[16px] leading-[1.55] text-ink-2">
          Lynq shows where people came from, what they read and what they did,
          on one page you can read in a minute. No cookies, no banner, and{" "}
          <Mark nowrap>no one being followed</Mark>.
        </p>
        <div className="mt-[26px] flex items-center">
          <Link href="/sign-up" className={BTN}>
            Start free
          </Link>
          <Link
            href="/login"
            className="ml-[18px] text-[13.5px] font-medium text-teal-ink hover:underline"
          >
            See Lynq in action →
          </Link>
        </div>
        <ul className="mt-[18px] flex flex-wrap gap-x-[18px] gap-y-1 text-[12.5px] text-mute">
          {["One line to install", "No cookies", "Always free"].map((t) => (
            <li key={t}>
              <span aria-hidden className="mr-[6px] text-teal">
                ✓
              </span>
              {t}
            </li>
          ))}
        </ul>
        {demo && <LiveCount initial={demo.visitorsNow} />}
      </div>
      <div className="relative rounded-[8px] border border-rule bg-canvas px-[18px] pb-[18px] pt-4 shadow-[0_24px_48px_-36px_rgba(10,10,10,.3)]">
        <div className="flex items-end gap-[14px] border-b border-rule-strong pb-[7px] text-[13px]">
          <b className="font-medium">Pages</b>
          <span className="relative text-ink after:absolute after:inset-x-0 after:-bottom-[8px] after:h-[2px] after:bg-teal after:content-['']">
            All
          </span>
          <span className="text-[12.5px] text-mute">Entry</span>
          <span className="text-[12.5px] text-mute">Exit</span>
        </div>
        <div className="mt-[6px] grid grid-cols-[1fr_110px_64px] gap-x-4 text-[13px]">
          <div className="flex min-h-[28px] items-center border-b border-rule text-[11.5px] text-mute">
            Page
          </div>
          <div className="border-b border-rule" />
          <div className="flex min-h-[28px] items-center justify-end border-b border-rule text-[11.5px] text-mute">
            Visitors
          </div>
          {pages.map((p, i) => {
            const cells = (
              <>
                <div className="flex min-h-[38px] items-center truncate">
                  {p.path}
                </div>
                <div className="flex min-h-[38px] items-center">
                  <i
                    aria-hidden
                    className="block h-[6px] rounded-[2px] bg-teal-2"
                    style={{ width: `${(p.visitors / max) * 100}%` }}
                  />
                </div>
                <div className="flex min-h-[38px] items-center justify-end font-medium tabular">
                  {p.visitors.toLocaleString("en-US")}
                </div>
              </>
            );
            return i === 1 ? (
              <div
                key={p.path}
                className="col-span-3 -mx-3 my-[2px] grid grid-cols-[1fr_110px_64px] gap-x-4 rounded-[6px] border border-teal bg-canvas px-3 shadow-[0_8px_24px_-12px_rgba(10,10,10,.35)]"
              >
                {cells}
              </div>
            ) : (
              <div
                key={p.path}
                className="col-span-3 grid grid-cols-[1fr_110px_64px] gap-x-4 border-b border-rule"
              >
                {cells}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Mark({
  children,
  nowrap = false,
}: {
  children: React.ReactNode;
  nowrap?: boolean;
}) {
  return (
    <mark
      className={`rounded-[3px] bg-teal-soft px-[0.12em] text-inherit ${nowrap ? "whitespace-nowrap" : ""}`}
    >
      {children}
    </mark>
  );
}
