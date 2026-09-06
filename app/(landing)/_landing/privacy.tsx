import { Eyebrow } from "./panels";
import { Reveal } from "./reveal";
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
const NUMBERS: [string, string][] = [
  ["2.1 kB", "script, gzipped"],
  ["0", "cookies"],
  ["24", "months of history by default"],
  ["9", "screens"],
];

/** One pageview as stored, and what is never stored (D-014). The numbers are true today. */
export function Privacy() {
  return (
    <Reveal className="mt-16 border-t border-rule pt-16">
      <div className="grid items-start gap-14 md:grid-cols-2">
        <div>
          <Eyebrow>Privacy</Eyebrow>
          <h2 className="mb-[14px] mt-2 text-[36px] font-medium leading-[1.12] tracking-[-0.025em]">
            No cookies.
            <br />
            No personal data.
          </h2>
          <p className="mb-[14px] max-w-[44ch] text-[15px] leading-[1.55] text-ink-2">
            This is everything Lynq stores about a visit. The visitor number is
            re-salted every day, so a visitor cannot be traced from one day to
            the next.
          </p>
          <p className="max-w-[44ch] text-[15px] leading-[1.55] text-ink-2">
            Identify users only if you want to, with{" "}
            <code className="rounded-[3px] bg-soft px-[5px] py-[1px] font-mono text-[12.5px]">
              lynq.identify()
            </code>
            . Ids are hashed before they are stored, and visitors with Global
            Privacy Control on are never identified.
          </p>
        </div>
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
      </div>
      <div className="mt-[72px] grid grid-cols-2 gap-8 border-t border-rule-strong pt-5 md:grid-cols-4">
        {NUMBERS.map(([n, label]) => (
          <div key={label}>
            <b className="block text-[40px] font-medium leading-none tracking-[-0.02em] tabular">
              {label === "cookies" ? (
                <mark className="rounded-[4px] bg-teal-soft px-[0.14em] text-inherit">
                  {n}
                </mark>
              ) : (
                n
              )}
            </b>
            <span className="mt-2 block text-[12.5px] text-mute">{label}</span>
          </div>
        ))}
      </div>
    </Reveal>
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
