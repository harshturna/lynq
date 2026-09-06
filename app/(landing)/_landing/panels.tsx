import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

/**
 * The staged product panels (D-014): real UI as an object inside a soft
 * panel, oversized and bleeding off its edge, with one element lifted over
 * it. Fixed demo numbers, presentational only.
 */
export function Feature({
  eyebrow,
  lead,
  rest,
  children,
  className,
}: {
  eyebrow: string;
  lead: string;
  rest: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={cn("mt-16 border-t border-rule pt-16", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Lead lead={lead} rest={rest} />
      {children}
    </Reveal>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-teal">
      {children}
    </span>
  );
}

export function Lead({
  lead,
  rest,
  small = false,
}: {
  lead: string;
  rest: string;
  small?: boolean;
}) {
  return (
    <p
      className={cn(
        "mb-7 mt-2 font-medium leading-[1.35] tracking-[-0.015em]",
        small ? "max-w-[34ch] text-[20px]" : "max-w-[30ch] text-[24px]"
      )}
    >
      {lead} <span className="font-normal text-mute">{rest}</span>
    </p>
  );
}

export function Panel({
  children,
  dots = false,
  className,
}: {
  children: ReactNode;
  dots?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-[440px] overflow-hidden rounded-[14px] bg-soft max-md:h-auto max-md:min-h-[320px] max-md:pb-4",
        dots &&
          "bg-[radial-gradient(#dcdce1_1px,transparent_1px)] [background-size:14px_14px]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Ui({
  children,
  className,
  style,
  lift = false,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  lift?: boolean;
}) {
  return (
    <div
      style={style}
      className={cn(
        "absolute rounded-[10px] border border-rule bg-canvas text-[13px] text-ink max-md:!relative max-md:!left-0 max-md:!right-auto max-md:!top-0 max-md:mx-4 max-md:mt-4 max-md:!w-auto max-md:overflow-x-auto",
        lift
          ? "shadow-[0_20px_50px_-20px_rgba(10,10,10,.35)]"
          : "shadow-[0_30px_60px_-40px_rgba(10,10,10,.35)]",
        className
      )}
    >
      <div className="px-[22px] py-[18px]">{children}</div>
    </div>
  );
}

export function SectionTitle({
  children,
  note,
  className,
}: {
  children: ReactNode;
  note?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-2 mt-[22px] flex items-baseline gap-[10px] text-[13.5px] font-medium",
        className
      )}
    >
      {children}
      {note && (
        <span className="text-[12px] font-normal text-mute">{note}</span>
      )}
    </div>
  );
}

type Tile = {
  label: string;
  value: string;
  delta?: string;
  tone?: "good" | "bad" | "warn";
  on?: boolean;
};

export function Strip({ tiles, cols = 6 }: { tiles: Tile[]; cols?: number }) {
  return (
    <div
      className="grid border-t border-rule-strong max-md:!grid-cols-2"
      style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}
    >
      {tiles.map((t) => (
        <div
          key={t.label}
          className={cn(
            "mr-[14px] border-b border-r border-rule py-[14px] pr-[14px] last:mr-0 last:border-r-0",
            t.on && "shadow-[inset_0_-2px_0_var(--teal)]"
          )}
        >
          <span
            className={cn("block text-[11.5px] text-mute", t.on && "text-teal")}
          >
            {t.label}
          </span>
          <b className="mt-[6px] block text-[26px] font-medium leading-none tracking-[-0.02em] tabular">
            {t.value}
          </b>
          {t.delta && (
            <em
              className={cn(
                "mt-2 inline-block rounded-[3px] px-[5px] py-[1px] text-[10.5px] not-italic",
                t.tone === "bad"
                  ? "bg-poor-soft text-poor"
                  : t.tone === "warn"
                    ? "bg-warn-soft text-warn"
                    : "bg-teal-soft text-teal"
              )}
            >
              {t.delta}
            </em>
          )}
        </div>
      ))}
    </div>
  );
}

const VISITORS =
  "M0,120 L60,112 L120,106 L180,70 L240,50 L300,92 L360,104 L420,98 L480,96 L540,80 L600,30 L660,44 L720,90 L780,84 L840,94 L900,80 L960,86 L1020,84 L1100,76";
const PREVIOUS =
  "M0,130 L60,126 L120,122 L180,110 L240,104 L300,118 L360,124 L420,120 L480,118 L540,112 L600,96 L660,100 L720,116 L780,112 L840,116 L900,110 L960,112 L1020,110 L1100,106";

export function OverviewPanel() {
  return (
    <Panel dots>
      <Ui style={{ left: 56, top: 48, width: 1180 }}>
        <Strip
          tiles={[
            {
              label: "Unique visitors",
              value: "2,069",
              delta: "▲ 4.2%",
              on: true,
            },
            { label: "Sessions", value: "2,311", delta: "▲ 3.8%" },
            { label: "Pageviews", value: "5,076", delta: "▲ 5.1%" },
            {
              label: "Bounce rate",
              value: "19%",
              delta: "▲ 1.2 pts",
              tone: "bad",
            },
            { label: "Engaged time", value: "1m 56s", delta: "▲ 3.0%" },
            { label: "Signup ★", value: "127", delta: "6.1%" },
          ]}
        />
        <SectionTitle note="per day">Unique visitors</SectionTitle>
        <svg
          viewBox="0 0 1100 150"
          preserveAspectRatio="none"
          aria-hidden
          className="block h-[150px] w-full"
        >
          <defs>
            <linearGradient id="ov-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0f766e" stopOpacity=".10" />
              <stop offset="1" stopColor="#0f766e" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${VISITORS} L1100,150 L0,150 Z`} fill="url(#ov-area)" />
          <path
            d={PREVIOUS}
            fill="none"
            stroke="#c6c6cc"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={VISITORS}
            fill="none"
            stroke="#0f766e"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx="1100" cy="76" r="3.5" fill="#0f766e" />
        </svg>
      </Ui>
      <Ui lift style={{ right: 64, top: 196, width: 330 }}>
        <SectionTitle note="KPI goal" className="mt-0">
          Signup
        </SectionTitle>
        <div className="flex items-baseline gap-[10px]">
          <b className="text-[34px] font-medium tracking-[-0.02em]">127</b>
          <em className="rounded-[3px] bg-teal-soft px-[6px] py-[2px] text-[11px] not-italic text-teal">
            ▲ 353.6%
          </em>
        </div>
        <p className="my-2 mb-3 text-[12.5px] text-ink-2">
          6.1% of sessions converted. 32% of the target of 400 per month.
        </p>
        <Funnel
          steps={[
            ["Visited the site", "2,069", 100],
            ["Fired signup", "127", 6],
          ]}
        />
      </Ui>
    </Panel>
  );
}

export function Funnel({ steps }: { steps: [string, string, number][] }) {
  return (
    <div className="flex flex-col gap-[14px]">
      {steps.map(([label, n, pct], i) => (
        <div key={label} className="text-[13px]">
          <div className="mb-[6px] flex justify-between">
            {label} <span className="text-mute tabular">{n}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-[2px] bg-soft">
            <i
              className={cn(
                "block h-full",
                i === steps.length - 1 ? "bg-teal" : "bg-teal-2"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const ROWS: [string, number, string, string][] = [
  ["/", 100, "566", "4.2%"],
  ["/pricing", 74, "418", "6.6%"],
  ["/docs/getting-started", 54, "305", "1.6%"],
  ["/signup", 44, "249", "4.5%"],
  ["/dashboard", 40, "226", "4.2%"],
  ["/login", 31, "177", "1.0%"],
];

/** The Attention view (D-016): the pool, split, then ranked by share. */
const ATTENTION: [string, number, string, string, string][] = [
  ["/docs/getting-started", 100, "21.7%", "16h 06m", "0.53×"],
  ["/", 56, "12.2%", "9h 00m", "0.72×"],
  ["/pricing", 49, "10.6%", "7h 52m", "2.21×"],
  ["/docs/integrations", 45, "9.8%", "7h 16m", "0.29×"],
  ["/blog/evals-are-your-product", 26, "5.7%", "4h 12m", "1.17×"],
];
const POOL = [21.7, 12.2, 10.6, 9.8, 5.7];

export function AttentionPanel() {
  const rest = 100 - POOL.reduce((a, n) => a + n, 0);
  return (
    <Panel className="h-[400px]">
      {/* oversized on purpose: the UI bleeds off the panel's right edge (D-014) */}
      <Ui style={{ left: 48, top: 40, width: 980 }}>
        <p className="mb-[10px] text-[12.5px] text-mute">
          <b className="mr-[6px] text-[24px] font-medium tracking-[-0.02em] text-ink">
            74 hours
          </b>
          of attention in the last 30 days
        </p>
        <div
          aria-hidden
          className="mb-[10px] flex h-3 w-full gap-px overflow-hidden rounded-[3px] bg-soft"
        >
          {POOL.map((share, i) => (
            <span
              key={ATTENTION[i][0]}
              className="h-full"
              style={{
                width: `${share}%`,
                background: `color-mix(in oklab, var(--teal) ${100 - i * 16}%, var(--teal-3))`,
              }}
            />
          ))}
          <span className="h-full bg-teal-3" style={{ width: `${rest}%` }} />
        </div>
        <p className="mb-[14px] text-[12.5px] leading-[1.5] text-ink-2">
          The 5 pages above hold <b className="font-medium text-ink">60%</b> of
          it. <b className="font-medium text-ink">/docs/getting-started</b>{" "}
          alone holds 16h 06m, and is read to the end 46% of the time.
        </p>
        <div className="grid grid-cols-[1fr_70px_86px_78px] gap-x-[14px] text-[13px] max-md:grid-cols-[1fr_64px_74px]">
          <Th>Page</Th>
          <Th right>Share</Th>
          <Th right className="max-md:hidden">
            Time
          </Th>
          <Th right>Influence</Th>
          {ATTENTION.map(([path, , share, time, lift]) => (
            <Fragment key={path}>
              <Td className="truncate">{path}</Td>
              <Td right className="font-medium text-ink">
                {share}
              </Td>
              <Td right className="max-md:hidden">
                {time}
              </Td>
              <Td right>{lift}</Td>
            </Fragment>
          ))}
        </div>
      </Ui>
    </Panel>
  );
}

export function FiltersPanel() {
  return (
    <Panel>
      <Ui style={{ left: 56, top: 44, width: 900 }}>
        <div className="mb-[14px] flex items-center gap-2 text-[12.5px]">
          <Chip>Country is Canada</Chip>
          <Chip>Page is /pricing</Chip>
          <span className="text-mute">+ Filter</span>
        </div>
        <div className="flex items-end gap-[14px] border-b border-rule-strong pb-[7px] text-[13.5px] font-medium">
          Pages
          <span className="relative text-[12.5px] font-normal text-ink after:absolute after:inset-x-0 after:-bottom-[8px] after:h-[2px] after:bg-teal after:content-['']">
            All
          </span>
          <span className="text-[12.5px] font-normal text-mute">Entry</span>
          <span className="text-[12.5px] font-normal text-mute">Exit</span>
        </div>
        <div className="grid grid-cols-[1fr_130px_70px_60px] gap-x-[14px] text-[13px] max-md:grid-cols-[1fr_72px_56px]">
          <Th>Page</Th>
          <Th />
          <Th right>Visitors</Th>
          <Th right className="max-md:hidden">
            change
          </Th>
          {ROWS.map(([path, w, n, c]) => (
            <div key={path} className="contents">
              <Td
                className={
                  path === "/pricing"
                    ? "font-medium text-teal-ink underline decoration-teal underline-offset-[3px]"
                    : ""
                }
              >
                {path}
              </Td>
              <Td>
                <i
                  aria-hidden
                  className="block h-[6px] rounded-[2px] bg-teal-2"
                  style={{ width: `${w}%` }}
                />
              </Td>
              <Td right className="font-medium tabular">
                {n}
              </Td>
              <Td right className="text-[12px] text-mute tabular max-md:hidden">
                <b className="mr-[3px] text-[8px] font-normal text-teal">▲</b>
                {c}
              </Td>
            </div>
          ))}
        </div>
      </Ui>
      <Ui lift style={{ right: 72, top: 70, width: 300 }}>
        <Field label="Dimension">Country</Field>
        <Field label="Value">Can|</Field>
        <div className="overflow-hidden rounded-[4px] border border-rule">
          {[
            ["🇨🇦 Canada", "556", true],
            ["🇨🇭 Switzerland", "—", false],
            ["🇮🇨 Canary Islands", "—", false],
          ].map(([l, n, hi]) => (
            <div
              key={String(l)}
              className={cn(
                "flex justify-between px-2 py-[6px] text-[13px]",
                hi && "bg-teal-soft"
              )}
            >
              {l}
              <span className="text-mute tabular">{n}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 text-[12px]">
          <span className="text-mute">Esc to close</span>
          <span className="rounded-[5px] bg-teal px-[10px] py-[5px] font-medium text-white">
            Add filter
          </span>
        </div>
      </Ui>
    </Panel>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[6px] rounded-[4px] border border-rule bg-canvas px-2 py-[3px]">
      {children} <i className="not-italic text-mute">×</i>
    </span>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-2 text-[12px] text-mute">
      {label}
      <div className="rounded-[4px] border border-rule bg-canvas px-2 py-[6px] text-[13px] text-ink">
        {children}
      </div>
    </div>
  );
}
function Th({
  children,
  right = false,
  className,
}: {
  children?: ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[30px] items-center border-b border-rule text-[11.5px] text-mute",
        right && "justify-end",
        className
      )}
    >
      {children}
    </div>
  );
}
function Td({
  children,
  right = false,
  className,
}: {
  children?: ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[38px] items-center border-b border-rule",
        right && "justify-end",
        className
      )}
    >
      {children}
    </div>
  );
}

const LCP_MOBILE =
  "M0,40 L60,50 L120,36 L180,44 L240,30 L300,46 L360,42 L420,48 L480,40 L540,44 L600,34 L660,42";
const LCP_DESKTOP =
  "M0,90 L60,92 L120,86 L180,94 L240,88 L300,92 L360,90 L420,94 L480,90 L540,92 L600,88 L660,92";

export function PerformancePanel() {
  return (
    <Panel className="h-[400px]">
      <Ui style={{ left: 36, top: 40, width: 720 }}>
        <Strip
          cols={5}
          tiles={[
            {
              label: "LCP p75",
              value: "2.6s",
              delta: "Needs work",
              tone: "warn",
            },
            {
              label: "INP p75",
              value: "235ms",
              delta: "Needs work",
              tone: "warn",
            },
            { label: "CLS p75", value: "0.07", delta: "Good" },
            { label: "FCP p75", value: "1.4s", delta: "Good" },
            { label: "TTFB p75", value: "503ms", delta: "Good" },
          ]}
        />
        <SectionTitle note="per day">LCP p75 by device</SectionTitle>
        <svg
          viewBox="0 0 660 120"
          preserveAspectRatio="none"
          aria-hidden
          className="block h-[120px] w-full"
        >
          <line
            x1="0"
            y1="60"
            x2="660"
            y2="60"
            stroke="#b42318"
            strokeWidth="1"
            strokeDasharray="3 4"
            opacity=".7"
          />
          <path
            d={LCP_MOBILE}
            fill="none"
            stroke="#0f766e"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={LCP_DESKTOP}
            fill="none"
            stroke="#0a0a0a"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </Ui>
      <Ui lift style={{ left: 300, top: 250, width: 300 }}>
        <SectionTitle note="/pricing · mobile" className="mb-2 mt-0">
          LCP element
        </SectionTitle>
        <div className="flex items-center justify-between text-[13px]">
          <code className="font-mono text-[12.5px]">h1.hero-title</code>
          <span className="font-medium">2.7s</span>
          <span className="inline-flex h-5 items-center gap-[5px] rounded-full bg-warn-soft px-2 text-[11px] font-semibold text-warn before:h-[6px] before:w-[6px] before:rounded-full before:bg-current before:content-['']">
            Needs work
          </span>
        </div>
      </Ui>
    </Panel>
  );
}

const BARS = [
  20, 14, 32, 24, 10, 38, 30, 50, 34, 60, 46, 74, 54, 68, 80, 62, 72, 84, 66,
  78, 58, 70, 90, 76, 64, 82, 74, 86, 70, 100,
];

export function RealtimePanel() {
  return (
    <Panel className="h-[400px]">
      <Ui style={{ left: 36, top: 40, width: 620 }}>
        <div className="flex items-end gap-10">
          <div>
            <span className="text-[11.5px] text-mute">
              Visitors on the site now
            </span>
            <div className="flex items-center gap-[10px]">
              <b className="text-[34px] font-medium leading-[1.1] tracking-[-0.02em]">
                23
              </b>
              <i
                aria-hidden
                className="pulse-dot inline-block h-2 w-2 rounded-full bg-teal"
              />
            </div>
          </div>
          <div>
            <span className="text-[11.5px] text-mute">
              Pageviews, last 30 min
            </span>
            <b className="block text-[34px] font-medium leading-[1.1] tracking-[-0.02em]">
              98
            </b>
          </div>
        </div>
        <SectionTitle note="last 30 min">Pageviews per minute</SectionTitle>
        <div className="flex h-[90px] items-end gap-[5px] border-b border-rule">
          {BARS.map((h, i) => (
            <i
              key={`${i}-${h}`}
              aria-hidden
              className={cn(
                "flex-1 rounded-t-[2px]",
                i === BARS.length - 1 ? "bg-teal" : "bg-teal-3"
              )}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <SectionTitle note="newest first">Activity</SectionTitle>
        <ol className="text-[12.5px]">
          {[
            [
              "02:31:26",
              "🇨🇦",
              <>
                <em className="font-medium not-italic text-teal-ink">
                  video_play
                </em>{" "}
                on /
              </>,
            ],
            ["02:31:24", "🇮🇪", "/docs/getting-started"],
            ["02:31:20", "🇩🇪", "/login"],
          ].map(([t, f, what]) => (
            <li
              key={String(t)}
              className="grid grid-cols-[56px_20px_1fr_auto] gap-[10px] border-b border-rule py-2"
            >
              <span className="text-mute tabular">{t}</span>
              <span aria-hidden>{f}</span>
              <span>{what}</span>
              <span className="text-[12px] font-medium text-teal-ink">
                Session
              </span>
            </li>
          ))}
        </ol>
      </Ui>
      <div className="absolute right-10 top-[300px] max-md:relative max-md:right-auto max-md:top-auto max-md:mx-4 max-md:mt-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-rule bg-canvas px-3 py-[6px] text-[12.5px] font-medium text-teal-ink shadow-[0_12px_30px_-16px_rgba(10,10,10,.4)]">
          <i
            aria-hidden
            className="pulse-dot inline-block h-[7px] w-[7px] rounded-full bg-teal"
          />
          3 new events, show
        </span>
      </div>
    </Panel>
  );
}
