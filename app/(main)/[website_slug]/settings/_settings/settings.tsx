"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { Pill } from "@/components/shell/badge";
import { deleteWebsite } from "@/lib/actions";
import { fmtAgo, fmtInt } from "@/lib/format";
import { explainDiagnostic } from "@/lib/screens/diagnostics";
import { setKpi } from "@/lib/screens/goal-actions";
import type { SettingsData } from "@/lib/screens/settings";
import {
  type SaveResult,
  saveData,
  saveExclusions,
  saveGeneral,
  saveTracking,
} from "@/lib/screens/settings-actions";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "tracking", label: "Tracking" },
  { id: "exclusions", label: "Exclusions" },
  { id: "kpi", label: "Goals and KPI" },
  { id: "data", label: "Data" },
  { id: "team", label: "Team" },
] as const;

const FIELD =
  "h-8 w-full max-w-[420px] rounded-control border border-rule bg-canvas px-2 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal disabled:bg-soft disabled:text-mute";
const AREA =
  "min-h-[88px] w-full max-w-[420px] rounded-control border border-rule bg-canvas px-2 py-1.5 font-mono text-[12.5px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal disabled:bg-soft disabled:text-mute";
/** Where the tracker is served from; the same on every host so the HTML matches on hydration. */
const SCRIPT_ORIGIN = "https://lynq.byharsh.com";

const SAVE =
  "h-8 rounded-control bg-ink px-3 text-[13px] font-medium text-canvas disabled:opacity-40";

/** The settings page body: sub-nav, sections, one save per section (design §8.10). */
export function SettingsPage({
  slug,
  userId,
  data,
  isGuest,
}: {
  slug: string;
  userId: string;
  data: SettingsData;
  isGuest: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-[200px_minmax(0,1fr)]">
      <nav
        aria-label="Settings sections"
        className="min-[1000px]:sticky min-[1000px]:top-4 min-[1000px]:self-start"
      >
        <ul className="flex flex-wrap gap-1 min-[1000px]:flex-col">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={cn(
                  "block rounded-control px-[10px] py-[6px] text-[13px] text-ink-2 hover:bg-soft hover:text-ink",
                  s.id === "team" && "text-mute"
                )}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-col gap-10">
        {isGuest && (
          <p
            role="status"
            className="rounded-control bg-soft px-3 py-2 text-[13px] text-mute"
          >
            You are the guest: every field is readable and every save is
            refused.
          </p>
        )}
        <General slug={slug} data={data} isGuest={isGuest} />
        <Tracking slug={slug} data={data} isGuest={isGuest} />
        <Exclusions slug={slug} data={data} isGuest={isGuest} />
        <Kpi slug={slug} data={data} isGuest={isGuest} />
        <DataSection
          slug={slug}
          data={data}
          isGuest={isGuest}
          userId={userId}
        />
        <Team />
      </div>
    </div>
  );
}

type SectionProps = { slug: string; data: SettingsData; isGuest: boolean };

function useSave(slug: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const run = (fn: () => Promise<SaveResult>, saved = "Saved.") =>
    start(async () => {
      setMessage(null);
      const res = await fn();
      if (!res.ok) return setMessage({ ok: false, text: res.error });
      setMessage({ ok: true, text: saved });
      router.refresh();
    });
  const status = message && (
    <p
      role="status"
      className={cn("text-[12.5px]", message.ok ? "text-good" : "text-poor")}
    >
      {message.text}
    </p>
  );
  return { pending, run, status, slug };
}

function Block({
  id,
  title,
  lede,
  children,
}: {
  id: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className="scroll-mt-6 border-t border-rule-strong pt-4"
    >
      <h2 id={`${id}-h`} className="text-[15px] font-medium">
        {title}
      </h2>
      <p className="mt-1 max-w-[64ch] text-[12.5px] text-mute">{lede}</p>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is the child; every caller passes one input, textarea or select
    <label className="grid gap-1 min-[640px]:grid-cols-[200px_minmax(0,1fr)] min-[640px]:gap-6">
      <span className="text-[13px] font-medium">
        {label}
        {hint && (
          <span className="mt-[2px] block text-[12px] font-normal text-mute">
            {hint}
          </span>
        )}
      </span>
      <span className="min-w-0">{children}</span>
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 text-[13px]">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[3px] accent-teal"
      />
      <span>
        {label}
        {hint && <span className="block text-[12px] text-mute">{hint}</span>}
      </span>
    </label>
  );
}

function General({ slug, data, isGuest }: SectionProps) {
  const [name, setName] = useState(data.name);
  const [timezone, setTimezone] = useState(data.timezone);
  const [shortcuts, setShortcuts] = useState(data.shortcuts);
  const [hostnames, setHostnames] = useState(data.hostnames.join("\n"));
  const s = useSave(slug);
  return (
    <Block
      id="general"
      title="General"
      lede="The name shown in Lynq, the hostnames that count as this site, and the timezone every range and chart uses."
    >
      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isGuest}
          className={FIELD}
        />
      </Field>
      <Field
        label="Hostnames"
        hint="One per line. Traffic from any other host is kept aside and shows in the diagnostics."
      >
        <textarea
          value={hostnames}
          onChange={(e) => setHostnames(e.target.value)}
          disabled={isGuest}
          className={AREA}
          rows={3}
        />
      </Field>
      <Field label="Timezone" hint="An IANA name such as America/Toronto.">
        <input
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          disabled={isGuest}
          className={FIELD}
          list="lynq-timezones"
        />
        <datalist id="lynq-timezones">
          {[
            "UTC",
            "America/Toronto",
            "America/New_York",
            "America/Los_Angeles",
            "Europe/London",
            "Europe/Berlin",
            "Asia/Kolkata",
            "Asia/Singapore",
            "Australia/Sydney",
          ].map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
      </Field>
      <Toggle
        label="Keyboard shortcuts"
        hint="[ and ] step the range, / focuses search, ? lists them."
        checked={shortcuts}
        onChange={setShortcuts}
        disabled={isGuest}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isGuest || s.pending}
          onClick={() =>
            s.run(() =>
              saveGeneral(slug, {
                name,
                timezone,
                shortcuts,
                hostnames: hostnames.split(/\n+/),
              })
            )
          }
          className={SAVE}
        >
          {s.pending ? "Saving…" : "Save general"}
        </button>
        {s.status}
      </div>
    </Block>
  );
}

function Tracking({ slug, data, isGuest }: SectionProps) {
  const [vitals, setVitals] = useState(true);
  const [outbound, setOutbound] = useState(false);
  const [autoEvents, setAutoEvents] = useState(false);
  const [storeTitles, setStoreTitles] = useState(data.storeTitles);
  const [storeUserIds, setStoreUserIds] = useState(data.storeUserIds);
  const [copied, setCopied] = useState(false);
  const s = useSave(slug);
  const snippet = `<script defer src="${SCRIPT_ORIGIN}/js/lynq.js" data-site="${data.url}"${vitals ? " data-vitals" : ""}${outbound ? " data-outbound" : ""}${autoEvents ? " data-auto-events" : ""}></script>`;
  return (
    <Block
      id="tracking"
      title="Tracking"
      lede="The snippet, what it reports, and what the ingest saw in the last 24 hours."
    >
      <div className="flex flex-col gap-2">
        <section
          aria-label="Tracking snippet"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region is keyboard-reachable (design §6)
          tabIndex={0}
          className="max-w-[720px] overflow-x-auto rounded-control bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        >
          <pre className="p-3 text-[12px]">{snippet}</pre>
        </section>
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
            className="h-8 rounded-control border border-rule px-3 text-[13px] hover:bg-soft"
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
      <div className="grid gap-3 min-[640px]:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-mute">
            In the snippet
          </span>
          <Toggle
            label="Web Vitals"
            hint="LCP, INP, CLS, FCP, TTFB per pageview."
            checked={vitals}
            onChange={setVitals}
          />
          <Toggle
            label="Outbound clicks"
            hint="An outbound_click event per external link."
            checked={outbound}
            onChange={setOutbound}
          />
          <Toggle
            label="Auto events"
            hint="Downloads and mailto links as events."
            checked={autoEvents}
            onChange={setAutoEvents}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-mute">
            Stored on the server
          </span>
          <Toggle
            label="Store page titles"
            hint="Off keeps only the path."
            checked={storeTitles}
            onChange={setStoreTitles}
            disabled={isGuest}
          />
          <Toggle
            label="Store user ids"
            hint="Hashed ids from lynq.identify(); off drops them."
            checked={storeUserIds}
            onChange={setStoreUserIds}
            disabled={isGuest}
          />
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              disabled={isGuest || s.pending}
              onClick={() =>
                s.run(() => saveTracking(slug, { storeTitles, storeUserIds }))
              }
              className={SAVE}
            >
              {s.pending ? "Saving…" : "Save tracking"}
            </button>
            {s.status}
          </div>
        </div>
      </div>
      <div className="rounded-card border border-rule p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-medium">Ingest diagnostics</span>
          <span className="text-[12.5px] text-mute">last 24 hours</span>
          <span className="ml-auto flex items-center gap-2 text-[12.5px] text-mute">
            {data.lastAt ? (
              <>
                <Pill status="good">Receiving data</Pill> last event{" "}
                {fmtAgo(new Date(data.lastAt))}
              </>
            ) : (
              <Pill status="none">No data yet</Pill>
            )}
          </span>
        </div>
        {data.diagnostics.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-mute">
            Nothing was rejected in the last 24 hours.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2 text-[12.5px]">
            {data.diagnostics.map((d) => (
              <li
                key={`${d.stage}-${d.hostname}`}
                className="flex flex-wrap items-baseline gap-2"
              >
                <Pill status="warn">{d.stage.replaceAll("_", " ")}</Pill>
                <span>{explainDiagnostic(d)}</span>
                <span className="text-mute tabular">
                  {fmtInt(d.count)} {d.count === 1 ? "time" : "times"}, last{" "}
                  {fmtAgo(new Date(d.lastAt))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Block>
  );
}

function Exclusions({ slug, data, isGuest }: SectionProps) {
  const [ips, setIps] = useState(data.excludedIps.join("\n"));
  const [paths, setPaths] = useState(data.excludedPaths.join("\n"));
  const s = useSave(slug);
  return (
    <Block
      id="exclusions"
      title="Exclusions"
      lede="Traffic that never reaches the numbers: your own addresses and the pages that are not the product."
    >
      <Field
        label="IP addresses"
        hint="One per line, as an address or a CIDR range."
      >
        <textarea
          value={ips}
          onChange={(e) => setIps(e.target.value)}
          disabled={isGuest}
          className={AREA}
          rows={3}
          placeholder="203.0.113.7&#10;198.51.100.0/24"
        />
      </Field>
      <Field
        label="Paths"
        hint="One glob per line; * matches anything, ? one character."
      >
        <textarea
          value={paths}
          onChange={(e) => setPaths(e.target.value)}
          disabled={isGuest}
          className={AREA}
          rows={3}
          placeholder="/preview/*&#10;/admin/*"
        />
      </Field>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isGuest || s.pending}
          onClick={() =>
            s.run(() =>
              saveExclusions(slug, {
                ips: ips.split(/\n+/),
                paths: paths.split(/\n+/),
              })
            )
          }
          className={SAVE}
        >
          {s.pending ? "Saving…" : "Save exclusions"}
        </button>
        {s.status}
      </div>
    </Block>
  );
}

function Kpi({ slug, data, isGuest }: SectionProps) {
  const [goalId, setGoalId] = useState<string>(
    data.kpiGoalId === null ? "" : String(data.kpiGoalId)
  );
  const s = useSave(slug);
  return (
    <Block
      id="kpi"
      title="Goals and KPI"
      lede="The KPI goal drives the Overview's sixth tile, the Sources strip and the quadrant. Goals themselves are managed on the Goals screen."
    >
      <Field label="KPI goal">
        <select
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
          disabled={isGuest}
          className={FIELD}
        >
          <option value="">None</option>
          {data.goals.map((g) => (
            <option key={g.id} value={String(g.id)}>
              {g.name} · {g.kind === "pageview" ? "page" : "event"} {g.match}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isGuest || s.pending}
          onClick={() =>
            s.run(
              async () => setKpi(slug, goalId ? Number(goalId) : null),
              "KPI saved."
            )
          }
          className={SAVE}
        >
          {s.pending ? "Saving…" : "Save KPI"}
        </button>
        <a
          href={`/${slug}/goals`}
          className="text-[12.5px] text-teal-ink hover:underline"
        >
          Manage goals
        </a>
        {s.status}
      </div>
    </Block>
  );
}

function DataSection({
  slug,
  data,
  isGuest,
  userId,
}: SectionProps & { userId: string }) {
  const router = useRouter();
  const [retention, setRetention] = useState(String(data.retentionMonths));
  const [breakpoints, setBreakpoints] = useState(data.breakpoints.join(", "));
  const [confirm, setConfirm] = useState("");
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState("");
  const s = useSave(slug);
  return (
    <Block
      id="data"
      title="Data"
      lede="How long events are kept, the breakpoints the Devices histogram uses, and the way out."
    >
      <Field
        label="Retention"
        hint="Months of events kept; older rows are removed overnight."
      >
        <input
          type="number"
          min={1}
          max={120}
          value={retention}
          onChange={(e) => setRetention(e.target.value)}
          disabled={isGuest}
          className={FIELD}
        />
      </Field>
      <Field
        label="Breakpoints"
        hint="Pixel widths, comma separated; the Devices histogram bands by them."
      >
        <input
          value={breakpoints}
          onChange={(e) => setBreakpoints(e.target.value)}
          disabled={isGuest}
          className={FIELD}
        />
      </Field>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isGuest || s.pending}
          onClick={() =>
            s.run(() =>
              saveData(slug, {
                retentionMonths: Number(retention),
                breakpoints: breakpoints
                  .split(/[,\s]+/)
                  .filter(Boolean)
                  .map(Number),
              })
            )
          }
          className={SAVE}
        >
          {s.pending ? "Saving…" : "Save data"}
        </button>
        {s.status}
      </div>
      <div className="mt-2 rounded-card border border-poor-soft p-4">
        <p className="text-[13px] font-medium text-poor">Delete this site</p>
        <p className="mt-1 max-w-[64ch] text-[12.5px] text-mute">
          Removes {data.url} and every event it has. Type the hostname to
          confirm; the rows go overnight.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={isGuest}
            placeholder={data.url}
            aria-label="Type the hostname to confirm"
            className={cn(FIELD, "max-w-[280px]")}
          />
          <button
            type="button"
            disabled={
              isGuest ||
              deleting ||
              confirm.trim().toLowerCase() !== data.url.toLowerCase()
            }
            onClick={() =>
              startDelete(async () => {
                setDeleteError("");
                const res = await deleteWebsite(slug, userId);
                if (typeof res === "string") return setDeleteError(res);
                if (res) return setDeleteError(res.message);
                router.push("/sites");
              })
            }
            className="h-8 rounded-control bg-poor px-3 text-[13px] font-medium text-canvas disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Delete site"}
          </button>
          {deleteError && (
            <p className="text-[12.5px] text-poor">{deleteError}</p>
          )}
        </div>
      </div>
    </Block>
  );
}

function Team() {
  return (
    <Block
      id="team"
      title="Team"
      lede="Invite people to see this site. Coming in Phase 2."
    >
      <p className="text-[12.5px] text-mute">Not available yet.</p>
    </Block>
  );
}
