"use client";

import { useMemo, useState } from "react";
import {
  type Column,
  DataTable,
  type TableRow,
  type ViewOption,
} from "@/components/shell/data-table";
import { ShowAllDrawer } from "@/components/shell/drawer";
import { SectionError } from "@/components/shell/section-error";
import { useViewState } from "@/components/shell/view-state";
import { SplitBar } from "@/components/shell/views";
import { FAMILY_LABEL, PAGE_FAMILIES } from "@/lib/crawler-families";
import { fmtAgo, fmtInt } from "@/lib/format";
import type { BotsLeadData, BotsPagesData } from "@/lib/screens/bots";
import type { Section as Settled } from "@/lib/screens/settle";
import { botsLead } from "./lead";

const SHOWN = 10;

const PAGE_VIEWS: ViewOption[] = [
  { key: "all", label: "All" },
  ...PAGE_FAMILIES.map((f) => ({ key: f, label: FAMILY_LABEL[f] })),
];

const ORIENTATION_LABEL: Record<string, string> = {
  "robots.txt": "robots.txt",
  "llms.txt": "llms.txt",
  sitemap: "sitemap",
};

/** The pool of crawler hits, split by family, and the sentence the split raises. */
export function BotsLead({
  data,
  rangeLabel,
}: {
  data: Settled<BotsLeadData>;
  rangeLabel: string;
}) {
  const { pending } = useViewState();
  if (!data.ok) return <SectionError title="Crawler hits" strong />;
  const lead = botsLead(data.data);
  if (!lead)
    return (
      <p className="text-[13.5px] text-mute">
        No crawler hit {rangeLabel}. Pick a wider range, or check the middleware
        is still reporting.
      </p>
    );
  const s = lead.sentence;
  return (
    <div
      aria-busy={pending}
      className={
        pending ? "opacity-70 transition-opacity" : "transition-opacity"
      }
    >
      <p className="mb-[10px] text-[13px] text-mute">
        <b className="mr-[6px] text-[26px] font-medium tracking-[-0.02em] text-ink tabular">
          {fmtInt(lead.total)}
        </b>
        crawler {lead.total === 1 ? "hit" : "hits"} {rangeLabel}
      </p>
      <SplitBar title="Hits by family" segments={lead.segments} ramp />
      <p className="mt-3 max-w-[70ch] text-[13.5px] text-ink-2">
        {s.opening}
        {s.top && (
          <>
            {" "}
            <b className="font-medium text-ink">{s.top.crawler}</b> alone came{" "}
            {fmtInt(s.top.hits)} {s.top.hits === 1 ? "time" : "times"}
            {s.llms > 0 && (
              <>
                , and <b className="font-medium text-ink">llms.txt</b> was read
                by {s.llms} {s.llms === 1 ? "crawler" : "crawlers"}
              </>
            )}
            .
          </>
        )}
      </p>
    </div>
  );
}

const ago: Column["format"] = (v) =>
  v === null ? "—" : fmtAgo(new Date(Number(v)));

/** Crawlers and the orientation files on the left, pages on the right. */
export function BotsTables({
  lead,
  pages,
}: {
  lead: Settled<BotsLeadData>;
  pages: Settled<BotsPagesData>;
}) {
  const { pending } = useViewState();
  const [crawlerDrawer, setCrawlerDrawer] = useState(false);
  const [pageDrawer, setPageDrawer] = useState(false);

  const crawlerColumns = useMemo<Column[]>(
    () => [
      { key: "hits", header: "Hits", align: "right", width: "84px" },
      {
        key: "pages",
        header: "Pages",
        align: "right",
        width: "72px",
        secondary: true,
      },
      {
        key: "last_seen",
        header: "Last seen",
        align: "right",
        width: "110px",
        format: ago,
        secondary: true,
      },
    ],
    []
  );
  const pageColumns = useMemo<Column[]>(
    () => [
      { key: "hits", header: "Hits", align: "right", width: "84px" },
      {
        key: "crawlers",
        header: "Crawlers",
        align: "right",
        width: "84px",
        secondary: true,
      },
    ],
    []
  );
  const fileColumns = useMemo<Column[]>(
    () => [
      { key: "hits", header: "Hits", align: "right", width: "84px" },
      { key: "crawlers", header: "Crawlers", align: "right", width: "84px" },
    ],
    []
  );

  const crawlerRows: TableRow[] = lead.ok
    ? lead.data.crawlers.map((r) => ({
        id: r.crawler,
        label: (
          <>
            {r.crawler}
            <span className="ml-3 text-[12px] text-mute">
              {FAMILY_LABEL[r.family]}
            </span>
          </>
        ),
        cells: {
          hits: r.hits,
          pages: r.pages,
          last_seen: r.last_seen.getTime(),
        },
      }))
    : [];
  const fileRows: TableRow[] = lead.ok
    ? lead.data.orientation.map((r) => ({
        id: r.path,
        label: ORIENTATION_LABEL[r.path] ?? r.path,
        cells: { hits: r.hits, crawlers: r.crawlers },
      }))
    : [];
  const pageRows: TableRow[] = pages.ok
    ? pages.data.rows.map((r) => ({
        id: r.path,
        label: r.path,
        cells: { hits: r.hits, crawlers: r.crawlers },
      }))
    : [];

  return (
    <div
      aria-busy={pending}
      className={
        pending ? "opacity-70 transition-opacity" : "transition-opacity"
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-2">
        <div className="flex flex-col gap-8">
          {lead.ok ? (
            <DataTable
              region="crawlers"
              title="Crawlers"
              labelHeader="Crawler"
              columns={crawlerColumns}
              rows={crawlerRows.slice(0, SHOWN)}
              defaultSort={{ col: "hits", dir: "desc" }}
              bar="hits"
              fill
              total={lead.data.crawlers[0]?.total ?? 0}
              onShowAll={
                crawlerRows.length > SHOWN
                  ? () => setCrawlerDrawer(true)
                  : undefined
              }
              exportName="crawlers"
              emptyText="No crawler in this range"
            />
          ) : (
            <SectionError title="Crawlers" />
          )}
          {lead.ok && fileRows.length > 0 && (
            <DataTable
              region="files"
              title="Looking for instructions"
              labelHeader="File"
              columns={fileColumns}
              rows={fileRows}
              defaultSort={{ col: "hits", dir: "desc" }}
              fill
              exportName="crawler-files"
            />
          )}
        </div>
        {pages.ok ? (
          <DataTable
            region="bots"
            title="Pages"
            labelHeader="Page"
            views={PAGE_VIEWS}
            defaultView="all"
            columns={pageColumns}
            rows={pageRows.slice(0, SHOWN)}
            defaultSort={{ col: "hits", dir: "desc" }}
            bar="hits"
            fill
            total={pages.data.total}
            onShowAll={
              pageRows.length > SHOWN ? () => setPageDrawer(true) : undefined
            }
            exportName={
              pages.data.family
                ? `crawler-pages-${pages.data.family}`
                : "crawler-pages"
            }
            emptyText={
              pages.data.family
                ? `No ${FAMILY_LABEL[pages.data.family].toLowerCase()} crawler fetched a page in this range`
                : "No page fetched in this range"
            }
          />
        ) : (
          <SectionError title="Pages" />
        )}
      </div>
      <ShowAllDrawer
        labelHeader="Crawler"
        open={crawlerDrawer}
        onOpenChange={setCrawlerDrawer}
        title="Crawlers"
        columns={crawlerColumns}
        rows={crawlerRows}
      />
      <ShowAllDrawer
        labelHeader="Page"
        open={pageDrawer}
        onOpenChange={setPageDrawer}
        title={
          pages.ok && pages.data.family
            ? `Pages · ${FAMILY_LABEL[pages.data.family]}`
            : "Pages"
        }
        columns={pageColumns}
        rows={pageRows}
      />
    </div>
  );
}
