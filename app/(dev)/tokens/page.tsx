import { notFound } from "next/navigation";

/**
 * Development-only review of the design tokens (TICKET-028). TICKET-031 adds the
 * component preview beside it. Never served in production.
 */
const COLORS: [string, string, string][] = [
  ["canvas", "#ffffff", "page"],
  ["soft", "#f5f5f7", "chips, tracks, code, hover rows"],
  ["soft-2", "#ececf0", "pressed, toggle track"],
  ["ink", "#0a0a0a", "headings, numbers, first column, chart labels"],
  ["ink-2", "#4a4a52", "body and table cells"],
  ["mute", "#63636c", "labels, captions, headers, axis text"],
  ["faint", "#9a9aa3", "placeholders and decorative marks only"],
  ["rule", "#e8e8ec", "row and section rules"],
  ["rule-strong", "#111111", "heavy rule, nav border"],
  ["teal", "#0f766e", "selection, active tab, chart primary"],
  ["teal-ink", "#0b5f59", "link text"],
  ["teal-soft", "#e3f1ef", "selected row, active nav"],
  ["teal-bar", "#e6f2f0", "RowBar share bars"],
  ["teal-2", "#7fbdb6", "second series"],
  ["teal-3", "#cfe6e2", "third series"],
  ["good", "#0c6a35", "up, Good"],
  ["good-soft", "#e1f3e8", ""],
  ["warn", "#845400", "Needs work"],
  ["warn-soft", "#fbefd2", ""],
  ["poor", "#b31e18", "down, Poor, danger"],
  ["poor-soft", "#fbe4e2", ""],
  ["compare", "#8a8a93", "previous period, informational sparklines"],
];

export default function TokensPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="min-h-screen bg-canvas font-sans text-ink p-10 flex flex-col gap-10">
      <header>
        <h1 className="text-[26px] font-medium tracking-[-0.02em]">Tokens</h1>
        <p className="text-mute text-[13px] mt-1">
          Design §3, D-008. Light only. Development route.
        </p>
      </header>

      <section>
        <h2 className="text-[14px] font-medium mb-3">Colour</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {COLORS.map(([name, hex, use]) => (
            <div
              key={name}
              className="flex items-center gap-3 py-2 border-b border-rule"
            >
              <span
                className="w-9 h-9 rounded-control border border-rule shrink-0"
                style={{ background: `var(--${name})` }}
              />
              <div className="min-w-0">
                <div className="text-[13px] font-medium">
                  --{name}{" "}
                  <span className="text-mute font-normal tabular">{hex}</span>
                </div>
                <div className="text-[12px] text-mute truncate">{use}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[14px] font-medium mb-3">Type scale · Geist</h2>
        <div className="flex flex-col gap-2 border-t border-rule-strong pt-3">
          <div className="text-[26px] font-medium tracking-[-0.02em]">
            Page title 26 / 500
          </div>
          <div className="text-[30px] font-medium tracking-[-0.02em] tabular">
            12,480
          </div>
          <div className="text-[14px] font-medium">Section title 14 / 500</div>
          <div className="text-[13.5px] text-ink-2">
            Body 13.5 · The quick brown fox jumps over the lazy dog.
          </div>
          <div className="text-[13px] text-ink-2 tabular">
            Table 13 · 4,490 · 2,610 · 1,520
          </div>
          <div className="text-[12px] text-mute">
            Label 12 · Aug 6 – Sep 4, 2026 · America/Toronto
          </div>
          <div className="text-[11.5px] text-mute uppercase tracking-[0.02em]">
            Header 11.5 · Visitors
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[14px] font-medium mb-3">Badges and pills</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="inline-flex items-center h-5 px-[7px] rounded-full text-[11.5px] font-semibold bg-good-soft text-good">
            ▲ 8.2%
          </span>
          <span className="inline-flex items-center h-5 px-[7px] rounded-full text-[11.5px] font-semibold bg-poor-soft text-poor">
            ▼ 3 pts
          </span>
          <span className="inline-flex items-center h-5 px-[7px] rounded-full text-[11.5px] font-semibold bg-soft text-ink-2">
            —
          </span>
          <span className="inline-flex items-center gap-[5px] h-5 px-2 rounded-full text-[11px] font-semibold bg-good-soft text-good before:content-[''] before:w-[6px] before:h-[6px] before:rounded-full before:bg-current">
            Good
          </span>
          <span className="inline-flex items-center gap-[5px] h-5 px-2 rounded-full text-[11px] font-semibold bg-warn-soft text-warn before:content-[''] before:w-[6px] before:h-[6px] before:rounded-full before:bg-current">
            Needs work
          </span>
          <span className="inline-flex items-center gap-[5px] h-5 px-2 rounded-full text-[11px] font-semibold bg-poor-soft text-poor before:content-[''] before:w-[6px] before:h-[6px] before:rounded-full before:bg-current">
            Poor
          </span>
          <a href="#top" className="text-[13px] font-medium text-teal-ink">
            Show all 128 pages
          </a>
          <span className="inline-flex items-center h-7 px-[11px] rounded-control bg-soft text-[12.5px] font-medium">
            <span className="text-mute font-normal mr-2">Country</span>🇨🇦 Canada
          </span>
          <button
            type="button"
            className="h-[30px] px-[10px] rounded-control bg-ink text-white text-[13px]"
          >
            Share
          </button>
          <button
            type="button"
            className="h-[30px] px-[10px] rounded-control border border-rule text-[13px]"
          >
            Last 30 days ▾
          </button>
        </div>
      </section>
    </main>
  );
}
