import type { Metadata } from "next";
import Link from "next/link";
import { LandingFooter } from "../_landing/closing";
import { Ledger } from "../_landing/ledger";
import { LandingNav } from "../_landing/nav";

export const metadata: Metadata = {
  title: "Privacy · Lynq",
  description:
    "What Lynq stores about a visit, what it never stores, and what site owners control.",
};

/**
 * The privacy page (TICKET-058): every sentence here is true of the code
 * today (D-003, D-005); change the code and change the sentence with it.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-canvas font-sans text-ink">
      <div className="mx-auto max-w-[1180px] px-8">
        <LandingNav />
      </div>
      <main className="mx-auto max-w-[1180px] px-8 pb-24 pt-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-teal">
          Privacy
        </p>
        <h1 className="mt-2 max-w-[20ch] text-[40px] font-medium leading-[1.06] tracking-[-0.025em] md:text-[52px]">
          What Lynq stores, and what it never does.
        </h1>
        <p className="mt-5 max-w-[60ch] text-[16px] leading-[1.55] text-ink-2">
          Lynq measures a website without following the people who use it. This
          page lists exactly what a visit leaves behind. It is short because the
          list is.
        </p>

        <div className="mt-16 grid items-start gap-14 md:grid-cols-2">
          <Section title="A visit, as stored">
            <p>
              Every pageview becomes one row: the page and its query string,
              where the visitor came from, the country, region and city from the
              request, the device, browser and operating system, the screen and
              viewport size, the language, how long the page was engaged with
              and how far it was scrolled. Page titles are off unless the site
              turns them on.
            </p>
            <p>
              Custom events add their name and the properties the site chose to
              send. Web Vitals add timings. That is the whole row.
            </p>
          </Section>
          <Ledger />
        </div>

        <div className="mt-16 grid gap-14 md:grid-cols-2">
          <Section title="Who a visitor is">
            <p>
              A visitor number is computed when the request arrives, from the IP
              address, the browser's user agent, the site, and a random salt
              that changes every day. The IP address is used for that
              computation and for the country lookup, then dropped. It is never
              written anywhere.
            </p>
            <p>
              Because the salt changes daily, the same person produces a
              different number tomorrow. Lynq can count a returning visitor
              within a day and cannot recognise them across days.
            </p>
          </Section>
          <Section title="Nothing in the browser">
            <p>
              Lynq sets no cookies. The script keeps one record in the tab's
              session storage so a visit can be counted as one session; it is
              gone when the tab closes. The only thing that persists is an
              opt-out flag, and only if the visitor sets it.
            </p>
            <p>
              No canvas, font, or audio fingerprinting. Nothing is read from the
              browser beyond the screen size, the viewport, and the language.
            </p>
          </Section>
          <Section title="If a site identifies its users">
            <p>
              A site can call{" "}
              <code className="rounded-[3px] bg-soft px-[5px] py-[1px] font-mono text-[12.5px]">
                lynq.identify(id)
              </code>{" "}
              for its own logged-in users. The id is hashed with a per-site
              secret before it is stored; the hash is what the reports use. The
              raw id is kept for 90 days only if the site turns that on, and is
              off by default.
            </p>
          </Section>
          <Section title="Global Privacy Control and Do Not Track">
            <p>
              A browser that sends Global Privacy Control is always treated as
              anonymous: pageviews are counted, and identify calls are ignored.
              There is no switch to turn this off.
            </p>
            <p>
              Do Not Track is honoured when the site asks for it with{" "}
              <code className="rounded-[3px] bg-soft px-[5px] py-[1px] font-mono text-[12.5px]">
                data-respect-dnt
              </code>{" "}
              on the script tag, in which case the script sends nothing at all.
            </p>
          </Section>
          <Section title="What a site owner controls">
            <p>
              Retention: events are kept for 24 months by default and removed
              nightly after that; the owner can shorten it. Exclusions: the
              owner can exclude their own IP addresses and any paths, and those
              visits are never recorded. Export: any table exports as CSV.
              Deletion: deleting a site removes every one of its events.
            </p>
          </Section>
          <Section title="Where it lives">
            <p>
              Lynq runs on Vercel, and the events live in a Postgres database at
              Supabase. Aggregates are the only thing the reports read; nothing
              is sold, shared, or used for anything but the site's own reports.
            </p>
            <p>
              The tracker's{" "}
              <Link
                href="https://docs-lynq.byharsh.com"
                className="text-teal-ink underline"
              >
                documentation
              </Link>{" "}
              describes every attribute the script accepts.
            </p>
          </Section>
        </div>
      </main>
      <div className="mx-auto max-w-[1180px] px-8">
        <LandingFooter />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-rule pt-4">
      <h2 className="text-[17px] font-medium tracking-[-0.01em]">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-[1.55] text-ink-2">
        {children}
      </div>
    </section>
  );
}
