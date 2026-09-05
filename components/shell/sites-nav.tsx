import Link from "next/link";
import { AccountMenu } from "./account-menu";

/** The bar above the sites list: wordmark, Docs, account. No site is chosen yet (design §4). */
export function SitesNav({ userEmail }: { userEmail: string }) {
  return (
    <div className="flex h-[54px] items-center gap-4 border-b border-rule-strong px-4 md:px-8">
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
      <div className="ml-auto flex items-center gap-4 text-[13px] text-ink-2">
        <a
          href="https://docs-lynq.byharsh.com"
          target="_blank"
          rel="noreferrer"
          className="hidden hover:text-ink sm:inline"
        >
          Docs
        </a>
        <AccountMenu userEmail={userEmail} />
      </div>
    </div>
  );
}
