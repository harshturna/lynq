import Link from "next/link";
import { LandingFooter } from "@/app/(landing)/_landing/closing";
import { BTN, LandingNav } from "@/app/(landing)/_landing/nav";

/** The 404, in the landing page's frame (D-008). */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-ink">
      <div className="mx-auto w-full max-w-[1180px] px-8">
        <LandingNav />
      </div>
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col items-start px-8 pb-24 pt-16 md:pt-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-teal">
          404
        </p>
        <h1 className="mt-2 max-w-[20ch] text-[34px] font-medium leading-[1.1] tracking-[-0.025em] md:text-[44px]">
          There is no page here.
        </h1>
        <p className="mt-4 max-w-[48ch] text-[15px] leading-[1.55] text-ink-2">
          The link may be old, or the site it pointed at may have been removed.
          Your sites are one click away.
        </p>
        <div className="mt-8 flex items-center gap-5">
          <Link href="/sites" className={BTN}>
            Go to my sites
          </Link>
          <Link href="/" className="text-[13.5px] text-ink-2 hover:text-ink">
            Home
          </Link>
        </div>
      </main>
      <div className="mx-auto w-full max-w-[1180px] px-8">
        <LandingFooter />
      </div>
    </div>
  );
}
