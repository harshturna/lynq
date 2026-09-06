"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AccountMenu, MENU_CONTENT, MENU_ITEM } from "./account-menu";

/**
 * The top navigation (design §4, §6): the nine sections with the active one
 * underlined in the accent, the site switcher, Settings and the account menu.
 * Under 768 px only Overview stays inline and the rest sit under More;
 * above that the row scrolls when it must.
 */
export const SECTIONS = [
  { key: "", label: "Overview" },
  { key: "realtime", label: "Realtime" },
  { key: "pages", label: "Pages" },
  { key: "sources", label: "Sources" },
  { key: "locations", label: "Locations" },
  { key: "devices", label: "Devices" },
  { key: "events", label: "Events" },
  { key: "goals", label: "Goals" },
  { key: "performance", label: "Performance" },
] as const;

export type SiteSummary = { slug: string; name: string; url: string };

export function TopNav({
  site,
  sites,
  userEmail,
}: {
  site: SiteSummary;
  sites: SiteSummary[];
  userEmail: string;
}) {
  const pathname = usePathname();
  const base = `/${site.slug}`;
  const active =
    pathname === base
      ? ""
      : pathname.startsWith(`${base}/`)
        ? pathname.slice(base.length + 1).split("/")[0]
        : null;
  const isSettings = active === "settings";
  // Under md only Overview stays inline; the rest sit under More (design §4).
  const inline = SECTIONS.slice(0, 1);
  const overflow = SECTIONS.slice(1);

  return (
    <header className="flex h-[54px] items-center gap-3 border-b border-rule-strong px-4 md:gap-6 md:px-8">
      <Link
        href="/sites"
        className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.14em] text-ink"
      >
        <span
          aria-hidden
          className="inline-block h-[10px] w-[10px] rounded-[3px] bg-teal"
        />
        LYNQ
      </Link>

      <nav
        aria-label="Sections"
        className="flex min-w-0 flex-1 items-stretch gap-4 self-stretch overflow-x-auto [scroll-padding-inline:16px] [scrollbar-width:none] md:gap-5"
      >
        {SECTIONS.map((s, i) => (
          <NavLink
            key={s.key}
            href={s.key ? `${base}/${s.key}` : base}
            current={active === s.key}
            className={i >= inline.length ? "hidden md:inline-flex" : ""}
          >
            {s.label}
          </NavLink>
        ))}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="inline-flex h-full items-center gap-1 self-stretch whitespace-nowrap text-[13.5px] text-ink-2 md:hidden"
              aria-label="More sections"
            >
              More{" "}
              <span aria-hidden className="text-[11px] text-faint">
                ▾
              </span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={4}
              className={MENU_CONTENT}
            >
              {overflow.map((s) => (
                <DropdownMenu.Item key={s.key} asChild className={MENU_ITEM}>
                  <Link
                    href={`${base}/${s.key}`}
                    aria-current={active === s.key ? "page" : undefined}
                  >
                    {s.label}
                  </Link>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </nav>

      <div className="flex shrink-0 items-center gap-4 text-[13px] text-ink-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-control px-1 py-1 hover:bg-soft"
            >
              <span className="hidden sm:inline">Site</span>
              <b className="max-w-[140px] truncate font-medium text-ink sm:max-w-none">
                {site.url}
              </b>
              <span aria-hidden className="text-[11px] text-faint">
                ▾
              </span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className={MENU_CONTENT}
            >
              <DropdownMenu.Label className="px-2 py-1 text-[11px] uppercase tracking-[0.06em] text-mute">
                Sites
              </DropdownMenu.Label>
              {sites.map((s) => (
                <DropdownMenu.Item key={s.slug} asChild className={MENU_ITEM}>
                  <Link
                    href={`/${s.slug}`}
                    aria-current={s.slug === site.slug ? "true" : undefined}
                  >
                    <span
                      className={cn(
                        "flex-1",
                        s.slug === site.slug && "font-medium text-ink"
                      )}
                    >
                      {s.url}
                    </span>
                    {s.slug === site.slug && (
                      <span aria-hidden className="text-teal">
                        ✓
                      </span>
                    )}
                  </Link>
                </DropdownMenu.Item>
              ))}
              <DropdownMenu.Separator className="my-1 h-px bg-rule" />
              <DropdownMenu.Item asChild className={MENU_ITEM}>
                <Link href="/sites/new">Add a site</Link>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <Link
          href={`${base}/settings`}
          aria-current={isSettings ? "page" : undefined}
          className={cn(
            "hidden rounded-control px-1 py-1 hover:text-ink sm:inline",
            isSettings && "font-medium text-ink"
          )}
        >
          Settings
        </Link>

        <AccountMenu userEmail={userEmail} settingsHref={`${base}/settings`} />
      </div>
    </header>
  );
}

function NavLink({
  href,
  current,
  className,
  children,
}: {
  href: string;
  current: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "tab-mark inline-flex h-full items-center self-stretch whitespace-nowrap text-[13.5px] transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal",
        current ? "font-medium text-ink" : "text-ink-2 hover:text-ink",
        className
      )}
    >
      {children}
    </Link>
  );
}
