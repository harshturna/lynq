"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Fades a section up 8 px the first time it enters the viewport; nothing under reduced motion. */
export function Reveal({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.add("pending");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            el.classList.remove("pending");
            io.disconnect();
          }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    // biome-ignore lint/suspicious/noExplicitAny: the ref is a section or a div
    <Tag ref={ref as any} className={cn("reveal", className)}>
      {children}
    </Tag>
  );
}
