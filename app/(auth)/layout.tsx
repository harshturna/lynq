import { LandingFooter } from "@/app/(landing)/_landing/closing";
import { LandingNav } from "@/app/(landing)/_landing/nav";

/** The auth pages are the landing page's frame with one form in it (D-008, D-014). */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-ink">
      <div className="mx-auto w-full max-w-[1180px] px-8">
        <LandingNav />
      </div>
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 items-start justify-center px-8 pb-24 pt-16 md:pt-24">
        {children}
      </main>
      <div className="mx-auto w-full max-w-[1180px] px-8">
        <LandingFooter />
      </div>
    </div>
  );
}
