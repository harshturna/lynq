"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Pill } from "@/components/shell/badge";
import { displayValue } from "@/components/shell/dimensions";
import { addWebsite } from "@/lib/actions";
import type { RealtimeRow } from "@/lib/query/realtime";
import { type Diagnostic, explainDiagnostic } from "@/lib/screens/diagnostics";
import { createGoal, type GoalInput } from "@/lib/screens/goal-actions";
import type { LiveResult } from "@/lib/screens/live";
import { diagnose } from "@/lib/screens/onboarding-actions";
import { cn, containsInvalidCharacters } from "@/lib/utils";

const SCRIPT_ORIGIN = "https://lynq.byharsh.com";
const POLL_MS = 3_000;
const DIAGNOSE_AFTER_MS = 60_000;
const FIELD =
  "h-8 w-full rounded-control border border-rule bg-canvas px-2 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal disabled:bg-soft disabled:text-mute";
const PRIMARY =
  "inline-flex h-[30px] items-center rounded-control bg-teal px-3 text-[13px] font-medium text-canvas hover:bg-teal-ink disabled:opacity-50";
const QUIET =
  "inline-flex h-[30px] items-center rounded-control border border-rule px-3 text-[13px] hover:bg-soft";

const STEPS = ["Install", "Listen", "Pick a KPI"] as const;

const KPI_SUGGESTIONS: { label: string; input: GoalInput }[] = [
  {
    label: "Signup",
    input: {
      name: "Signup",
      kind: "event",
      match: "signup",
      revenue: false,
      target: null,
      kpi: true,
    },
  },
  {
    label: "Trial started",
    input: {
      name: "Trial started",
      kind: "event",
      match: "trial_started",
      revenue: false,
      target: null,
      kpi: true,
    },
  },
  {
    label: "Checkout started",
    input: {
      name: "Checkout started",
      kind: "event",
      match: "checkout_start",
      revenue: true,
      target: null,
      kpi: true,
    },
  },
  {
    label: "Visited /docs/*",
    input: {
      name: "Visited docs",
      kind: "pageview",
      match: "/docs/*",
      revenue: false,
      target: null,
      kpi: true,
    },
  },
];

/** Three steps on one page; the step and the site live in the URL (design §8.11). */
export function Onboarding({
  userId,
  isGuest,
}: {
  userId: string;
  isGuest: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const slug = sp.get("site") ?? "";
  const step = slug
    ? Math.min(3, Math.max(1, Number(sp.get("step") ?? 1) || 1))
    : 1;
  const go = (s: number, site = slug) =>
    router.replace(`/sites/new?site=${encodeURIComponent(site)}&step=${s}`);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-medium leading-[1.1] tracking-[-0.02em]">
          Add a site
        </h1>
        <p className="mt-[6px] text-[13px] text-mute">
          Three steps: install, watch the first event arrive, pick what counts.
        </p>
      </div>
      <ol className="grid grid-cols-3 border-t border-rule-strong border-b border-rule">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n < step ? "done" : n === step ? "on" : "todo";
          return (
            <li
              key={label}
              aria-current={state === "on" ? "step" : undefined}
              className={cn(
                "flex items-center gap-3 py-[14px] pr-4 text-[13px]",
                state === "on"
                  ? "font-medium text-ink"
                  : state === "done"
                    ? "text-ink-2"
                    : "text-mute"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold",
                  state === "on" && "border-ink bg-ink text-canvas",
                  state === "done" &&
                    "border-transparent bg-good-soft text-good",
                  state === "todo" && "border-rule"
                )}
              >
                {state === "done" ? "✓" : n}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
      {step === 1 && (
        <Install
          userId={userId}
          isGuest={isGuest}
          slug={slug}
          onNext={(s) => go(2, s)}
        />
      )}
      {step === 2 && slug && (
        <Listen slug={slug} onNext={() => go(3)} onBack={() => go(1)} />
      )}
      {step === 3 && slug && <PickKpi slug={slug} isGuest={isGuest} />}
    </div>
  );
}

function Install({
  userId,
  isGuest,
  slug,
  onNext,
}: {
  userId: string;
  isGuest: boolean;
  slug: string;
  onNext: (slug: string) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState(slug ? slug.replaceAll("-", ".") : "");
  const [created, setCreated] = useState<string | null>(slug || null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const host = created
    ? created.replaceAll("-", ".")
    : url.trim().toLowerCase();
  const snippet = `<script defer src="${SCRIPT_ORIGIN}/js/lynq.js" data-site="${host || "example.com"}" data-vitals></script>`;
  const submit = () =>
    start(async () => {
      setError("");
      const h = url.trim().toLowerCase();
      if (
        h.startsWith("http") ||
        h.includes("/") ||
        !h.includes(".") ||
        containsInvalidCharacters(h)
      )
        return setError("Only the hostname, e.g. example.com");
      const res = await addWebsite(name.trim(), h, userId);
      if (typeof res === "string") return setError(res);
      if (res.error)
        return setError(
          res.status === 409 || res.error.code === "23505"
            ? "This site is already tracked by Lynq."
            : "Couldn't add the site."
        );
      setCreated(h.replaceAll(".", "-"));
    });
  return (
    <section className="flex flex-col gap-5">
      {!created ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {isGuest && (
            <p
              role="status"
              className="rounded-control bg-soft px-3 py-2 text-[13px] text-mute"
            >
              The guest account cannot add sites; the steps below show what a
              new site sees.
            </p>
          )}
          <div className="grid gap-3 min-[640px]:grid-cols-2">
            <label className="flex flex-col gap-1 text-[13px]">
              <span className="text-[11.5px] text-mute">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aivia"
                required
                disabled={isGuest}
                className={FIELD}
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px]">
              <span className="text-[11.5px] text-mute">Hostname</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="aivia.byharsh.com"
                required
                disabled={isGuest}
                className={FIELD}
              />
            </label>
          </div>
          {error && <p className="text-[12px] text-poor">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isGuest || pending}
              className={PRIMARY}
            >
              {pending ? "Adding…" : "Add site"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-[13px]">
          <Pill status="good">Added</Pill>{" "}
          <b className="ml-2 font-medium">{host}</b>
        </p>
      )}
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium">
          Put this before the closing head tag
        </p>
        <pre className="overflow-x-auto rounded-control bg-soft p-3 text-[12px]">
          {snippet}
        </pre>
        <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(snippet);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                setCopied(false);
              }
            }}
            className={QUIET}
          >
            {copied ? "Copied" : "Copy snippet"}
          </button>
          <span className="text-mute">Guides:</span>
          {[
            ["Next.js", "nextjs"],
            ["Astro", "astro"],
            ["Plain HTML", "html"],
            ["WordPress", "wordpress"],
          ].map(([l, k]) => (
            <a
              key={k}
              href={`https://docs-lynq.byharsh.com/install/${k}`}
              target="_blank"
              rel="noreferrer"
              className="text-teal-ink hover:underline"
            >
              {l}
            </a>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-rule pt-4">
        <button
          type="button"
          disabled={!created}
          onClick={() => created && onNext(created)}
          className={PRIMARY}
        >
          I've installed it
        </button>
        <Link href="/sites" className="text-[12.5px] text-mute hover:text-ink">
          Later
        </Link>
      </div>
    </section>
  );
}

type Check = { key: string; label: string; ok: boolean };

function Listen({
  slug,
  onNext,
  onBack,
}: {
  slug: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [data, setData] = useState<RealtimeRow | null>(null);
  const [error, setError] = useState("");
  const [diagnostics, setDiagnostics] = useState<Diagnostic[] | null>(null);
  const startedAt = useRef(Date.now());
  const accepted = Boolean(data && data.pageviews > 0);
  const first = data?.events.filter((e) => e.event === "pageview").at(-1);
  useEffect(() => {
    if (accepted) return;
    let live = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/live/${slug}`, { cache: "no-store" });
        const body = (await res.json()) as LiveResult | { kind: "error" };
        if (!live) return;
        if (body.kind === "ok") setData(body.data);
        else if (body.kind === "unauthenticated")
          setError("Your session expired; sign in again.");
        else if (body.kind === "forbidden")
          setError("This site is not yours to watch.");
      } catch {
        /* try again on the next tick */
      }
      if (
        live &&
        Date.now() - startedAt.current > DIAGNOSE_AFTER_MS &&
        diagnostics === null
      ) {
        try {
          setDiagnostics(await diagnose(slug));
        } catch {
          setDiagnostics([]);
        }
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [slug, accepted, diagnostics]);
  const sawSomething = accepted || (diagnostics?.length ?? 0) > 0;
  const checks: Check[] = [
    {
      key: "installed",
      label: "Snippet installed and reaching Lynq",
      ok: sawSomething,
    },
    { key: "host", label: "Hostname matches this site", ok: accepted },
    { key: "pageview", label: "First pageview accepted", ok: accepted },
    {
      key: "vitals",
      label: "Web Vitals reported",
      ok: Boolean(data && data.vitals > 0),
    },
  ];
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-[13px]">
        <span
          aria-hidden
          className={cn(
            "inline-block h-[7px] w-[7px] rounded-full",
            accepted
              ? "bg-good shadow-[0_0_0_3px_var(--good-soft)]"
              : "bg-teal animate-pulse"
          )}
        />
        <span role="status">
          {accepted
            ? "The first pageview is in."
            : "We are listening. Open your site in another tab."}
        </span>
      </div>
      <ul className="flex flex-col">
        {checks.map((c) => (
          <li
            key={c.key}
            className="flex items-center gap-3 border-b border-rule py-[9px] text-[13px]"
          >
            <span
              aria-hidden
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                c.ok
                  ? "bg-good-soft text-good"
                  : "border border-rule text-faint"
              )}
            >
              {c.ok ? "✓" : "·"}
            </span>
            <span className={c.ok ? "text-ink" : "text-mute"}>{c.label}</span>
            <span className="sr-only">{c.ok ? ", done" : ", waiting"}</span>
          </li>
        ))}
      </ul>
      {first && (
        <p className="rounded-card border border-good bg-good-soft px-4 py-3 text-[13px]">
          <b className="font-medium">First pageview:</b> {first.path} ·{" "}
          {displayValue("country", first.country)} · {first.browser}
        </p>
      )}
      {error && <p className="text-[12.5px] text-poor">{error}</p>}
      {!accepted && diagnostics !== null && (
        <div className="rounded-card border border-rule p-4 text-[13px]">
          <p className="font-medium">
            Nothing accepted yet. Here is what the ingest saw in the last 15
            minutes:
          </p>
          {diagnostics.length === 0 ? (
            <p className="mt-1 text-mute">
              No requests at all reached Lynq for this hostname. Is the snippet
              on a page you opened, and does the page load it without a blocker?
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {diagnostics.map((d) => (
                <li
                  key={`${d.stage}-${d.hostname}`}
                  className="flex flex-wrap items-baseline gap-2"
                >
                  <Pill status="warn">{d.stage.replaceAll("_", " ")}</Pill>
                  <span>{explainDiagnostic(d)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="flex items-center gap-3 border-t border-rule pt-4">
        <button type="button" onClick={onNext} className={PRIMARY}>
          {accepted ? "Next" : "Skip for now"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-[12.5px] text-mute hover:text-ink"
        >
          Back to the snippet
        </button>
      </div>
    </section>
  );
}

function PickKpi({ slug, isGuest }: { slug: string; isGuest: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<string | null>(null);
  const pick = (s: (typeof KPI_SUGGESTIONS)[number]) =>
    start(async () => {
      setError("");
      setChosen(s.label);
      const res = await createGoal(slug, s.input);
      if (!res.ok) {
        setChosen(null);
        return setError(res.error);
      }
      router.push(`/${slug}`);
    });
  return (
    <section className="flex flex-col gap-5">
      <p className="text-[13px] text-mute">
        The KPI is the one goal the Overview leads with. Pick a suggestion, or
        skip and set it later on the Goals screen.
      </p>
      <div className="grid gap-3 min-[640px]:grid-cols-2">
        {KPI_SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            type="button"
            disabled={isGuest || pending}
            onClick={() => pick(s)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-card border border-rule p-4 text-left hover:border-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-50",
              chosen === s.label && "border-teal"
            )}
          >
            <span className="text-[13.5px] font-medium">{s.label}</span>
            <span className="text-[12px] text-mute">
              {s.input.kind === "pageview"
                ? "a page is viewed"
                : "an event fires"}{" "}
              · <code>{s.input.match}</code>
            </span>
          </button>
        ))}
      </div>
      {isGuest && (
        <p className="text-[12.5px] text-mute">
          The guest account cannot create goals.
        </p>
      )}
      {error && <p className="text-[12.5px] text-poor">{error}</p>}
      <div className="flex items-center gap-3 border-t border-rule pt-4">
        <Link href={`/${slug}`} className={QUIET}>
          Skip, go to the Overview
        </Link>
      </div>
    </section>
  );
}
