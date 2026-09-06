import { Ledger } from "./ledger";
import { Eyebrow } from "./panels";
import { Reveal } from "./reveal";

const NUMBERS: [string, string][] = [
  ["2.1 kB", "script, gzipped"],
  ["0", "cookies"],
  ["24", "months of history by default"],
  ["10", "screens"],
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
        <Ledger />
      </div>
      <div className="mt-[72px] grid grid-cols-2 gap-8 border-t border-rule-strong pt-5 md:grid-cols-4">
        {NUMBERS.map(([n, label]) => (
          <div key={label}>
            <b className="block text-[40px] font-medium leading-none tracking-[-0.02em] tabular">
              {n}
            </b>
            <span className="mt-2 block text-[12.5px] text-mute">{label}</span>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
