"use client";

import { useEffect, useState } from "react";

const HEX = "0123456789abcdef";
const EVERY_MS = 5_000;

/** A visitor number that re-scrambles itself: the daily salt, demonstrated. */
export function Salt({ initial = "7f3a9c2e41b8d605" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      let target = "";
      for (let i = 0; i < 16; i++)
        target += HEX[Math.floor(Math.random() * 16)];
      let step = 0;
      const from = value;
      const inner = window.setInterval(() => {
        step++;
        let out = "";
        for (let i = 0; i < 16; i++)
          out +=
            i < step
              ? target[i]
              : Math.random() < 0.5
                ? HEX[Math.floor(Math.random() * 16)]
                : from[i];
        setValue(out);
        if (step >= 16) window.clearInterval(inner);
      }, 28);
    }, EVERY_MS);
    return () => window.clearInterval(id);
  }, [value]);
  return (
    <code className="rounded-[4px] bg-teal-soft px-[6px] py-[2px] tracking-[0.04em]">
      {value}
    </code>
  );
}
