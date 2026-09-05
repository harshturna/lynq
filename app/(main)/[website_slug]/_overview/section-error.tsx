"use client";

import { useRouter } from "next/navigation";
import { Section } from "@/components/shell/section";

/** A section that failed keeps its title and offers a retry (design §12). */
export function SectionError({
  title,
  strong,
}: {
  title: string;
  strong?: boolean;
}) {
  const router = useRouter();
  return (
    <Section title={title} strong={strong}>
      <p className="py-4 text-[13px] text-mute">
        Couldn't load this.{" "}
        <button
          type="button"
          onClick={() => router.refresh()}
          className="text-teal-ink underline underline-offset-2 hover:text-teal"
        >
          Retry
        </button>
      </p>
    </Section>
  );
}
