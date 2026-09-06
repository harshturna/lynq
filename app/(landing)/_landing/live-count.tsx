"use client";

import { useEffect, useState } from "react";

const POLL_MS = 10_000;

/** "23 people on the demo site right now", refreshed from the public demo route. */
export function LiveCount({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/demo/live", { cache: "no-store" });
        const body = (await res.json()) as { visitorsNow: number | null };
        if (!stopped && typeof body.visitorsNow === "number")
          setCount(body.visitorsNow);
      } catch {}
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, []);
  return (
    <p className="mt-[14px] flex items-center gap-2 text-[12.5px] text-mute">
      <i
        aria-hidden
        className="pulse-dot inline-block h-[7px] w-[7px] rounded-full bg-teal"
      />
      {count === 0 ? (
        <>Quiet on the demo site right now</>
      ) : (
        <>
          <b className="font-medium text-ink tabular">{count}</b>
          {count === 1 ? "person" : "people"} on the demo site right now
        </>
      )}
    </p>
  );
}
