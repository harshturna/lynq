import { Eyebrow, Lead, Panel, Ui } from "./panels";
import { Reveal } from "./reveal";

const CHECKS = [
  "Snippet installed and reaching Lynq",
  "Hostname matches this site",
  "First pageview accepted",
  "Web Vitals reported",
];

/** Three steps beside the onboarding's own check list (D-014). */
export function Steps() {
  return (
    <Reveal className="mt-16 border-t border-rule pt-16">
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-14 md:grid-cols-[minmax(0,.42fr)_minmax(0,.58fr)]">
        <div className="min-w-0">
          <Eyebrow>Getting started</Eyebrow>
          <Lead
            lead="Set up in a minute."
            rest="Paste one line and Lynq confirms it the moment the first visitor lands."
          />
          <div className="mt-5 flex flex-col gap-[22px]">
            <Step n={1} title="Add your site">
              <p className="text-[14px] text-ink-2">
                Give it a name and a hostname.
              </p>
            </Step>
            <Step n={2} title="Paste one line">
              <pre
                // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region is keyboard-reachable (design §6)
                tabIndex={0}
                className="mt-2 overflow-x-auto rounded-[6px] bg-soft px-[14px] py-3 text-[12px] leading-[1.5]"
              >
                {
                  '<script defer src="https://lynq.byharsh.com/js/lynq.js"\n  data-site="'
                }
                <mark className="rounded-[3px] bg-teal-soft px-[3px] py-[1px] text-teal-ink">
                  your-site.com
                </mark>
                {'" data-vitals></script>'}
              </pre>
            </Step>
            <Step n={3} title="See your first pageview">
              <p className="text-[14px] text-ink-2">
                Each check turns green as the data lands.
              </p>
            </Step>
          </div>
        </div>
        <Panel className="h-[360px]">
          <Ui style={{ left: 40, top: 40, width: 560 }}>
            <div className="mb-[14px] flex gap-7 border-b border-rule-strong pb-[10px] text-[13px]">
              <span className="text-teal">✓ Install</span>
              <span className="font-medium">2 Listen</span>
              <span className="text-mute">3 Pick a KPI</span>
            </div>
            <div className="mb-3 text-[13px]">
              <i
                aria-hidden
                className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-teal"
              />
              The first pageview is in.
            </div>
            <ul className="text-[13px]">
              {CHECKS.map((c, i) => (
                <li
                  key={c}
                  className={
                    i === CHECKS.length - 1
                      ? "py-2"
                      : "border-b border-rule py-2"
                  }
                >
                  <span aria-hidden className="mr-[10px] text-teal">
                    ✓
                  </span>
                  {c}
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-[6px] border border-teal bg-teal-soft px-3 py-2 text-[12.5px]">
              <b className="font-medium">First pageview:</b> /features · 🇬🇧
              United Kingdom · Chrome
            </div>
          </Ui>
        </Panel>
      </div>
    </Reveal>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="font-mono text-[11.5px] text-mute">Step {n}</span>
      <h3 className="my-1 text-[16px] font-medium">{title}</h3>
      {children}
    </div>
  );
}
