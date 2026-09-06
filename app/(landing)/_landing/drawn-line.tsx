"use client";

import { useEffect, useRef } from "react";

const W = 1116;
const H = 160;

/** The demo site's last 30 days as one hairline that draws itself once it is in view. */
export function DrawnLine({ values }: { values: number[] }) {
  const lineRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const max = Math.max(1, ...values);
  const n = Math.max(2, values.length);
  const pts = values.map((v, i) => [
    (i / (n - 1)) * W,
    H - 10 - (v / max) * (H - 30),
  ]);
  const d = pts
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const last = pts[pts.length - 1] ?? [W, H - 10];

  useEffect(() => {
    const line = lineRef.current;
    const area = areaRef.current;
    const dot = dotRef.current;
    if (!line || !area || !dot) return;
    const finish = () => {
      area.style.opacity = "1";
      dot.style.opacity = "1";
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    const len = line.getTotalLength();
    line.style.strokeDasharray = String(len);
    line.style.strokeDashoffset = String(len);
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        line.style.transition =
          "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)";
        requestAnimationFrame(() => {
          line.style.strokeDashoffset = "0";
        });
        window.setTimeout(() => {
          area.style.transition = "opacity .6s";
          dot.style.transition = "opacity .3s";
          finish();
        }, 1300);
      },
      { threshold: 0.4 }
    );
    io.observe(line.ownerSVGElement ?? line);
    return () => io.disconnect();
  }, []);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden
      className="mt-2 block h-[160px] w-full"
    >
      <defs>
        <linearGradient id="landing-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f766e" stopOpacity=".10" />
          <stop offset="1" stopColor="#0f766e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        ref={areaRef}
        d={`${d} L${W},${H} L0,${H} Z`}
        fill="url(#landing-area)"
        style={{ opacity: 0 }}
      />
      <path
        ref={lineRef}
        d={d}
        fill="none"
        stroke="#0f766e"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        ref={dotRef}
        cx={last[0]}
        cy={last[1]}
        r="4"
        fill="#0f766e"
        style={{ opacity: 0 }}
      />
    </svg>
  );
}
