import { Salt } from "./salt";

const STORED: [string, string][] = [
  ["path", "/pricing"],
  ["referrer", "google.com · Organic Search"],
  ["country", "CA · Ontario · Toronto"],
  ["device", "desktop · Chrome 128 · macOS"],
  ["viewport", "1440 × 900"],
];
const NEVER: [string, string][] = [
  ["ip address", "203.0.113.7"],
  ["cookie", "_ga=GA1.2.1234…"],
  ["fingerprint", "canvas, fonts, audio"],
  ["name, email", "—"],
];

/** One pageview as stored, and what is never stored (D-014). */
export function Ledger() {
  return (
    <div className="rounded-[8px] border border-rule bg-canvas px-5 pb-4 pt-[6px] font-mono text-[12.5px] shadow-[0_24px_48px_-36px_rgba(10,10,10,.3)]">
      <LedgerHead>One pageview, as stored</LedgerHead>
      {STORED.map(([k, v]) => (
        <Row key={k} k={k}>
          {v}
        </Row>
      ))}
      <Row k="visitor">
        <Salt /> <span className="text-mute">re-salted every day</span>
      </Row>
      <LedgerHead>Never stored</LedgerHead>
      {NEVER.map(([k, v], i) => (
        <Row key={k} k={k} last={i === NEVER.length - 1}>
          <span className="text-mute line-through">{v}</span>
        </Row>
      ))}
    </div>
  );
}

function LedgerHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-[6px] pt-3 font-sans text-[11px] font-medium uppercase tracking-[0.08em] text-mute">
      {children}
    </div>
  );
}
function Row({
  k,
  children,
  last = false,
}: {
  k: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[120px_1fr] gap-4 py-[10px] ${last ? "" : "border-b border-rule"}`}
    >
      <span className="text-mute">{k}</span>
      <span>{children}</span>
    </div>
  );
}
