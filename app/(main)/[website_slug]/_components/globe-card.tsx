"use client";

import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import { Card, CardContent } from "@/components/ui/card";
import { groupByAnalytics } from "@/lib/utils";
import { lookupCentroid } from "@/lib/geo/country-centroids";
import ShareBarList from "./share-bar-list";

interface GlobeCardProps {
  data: AnalyticsDataWithSessionData[];
}

/**
 * cobe renders to a canvas via WebGL, which doesn't exist during SSR and may
 * be unavailable in headless/older browsers. We mount it only after checking,
 * and fall back to the plain ranked list so the panel is never empty.
 */
const hasWebGL = () => {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
};

const GlobeCard = ({ data }: GlobeCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglReady, setWebglReady] = useState<boolean | null>(null);

  // Interaction state kept in refs — these are read inside cobe's render loop
  // on every frame, so routing them through state would rerender constantly
  const phiRef = useRef(0);
  const dragStartRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const autoRotateRef = useRef(true);

  const countries = groupByAnalytics("countries", data) ?? [];
  const total = countries.reduce((sum, c) => sum + c.count, 0);

  // Serialized marker list — a stable dependency for the effect below, so the
  // globe isn't torn down and rebuilt on every parent render
  const markerKey = countries
    .map((c) => `${c.group}:${c.count}`)
    .join("|");

  useEffect(() => {
    setWebglReady(hasWebGL());
  }, []);

  useEffect(() => {
    if (!webglReady || !canvasRef.current) return;

    const markers = countries
      .map((country) => {
        const centroid = lookupCentroid(String(country.group));
        if (!centroid) return null;
        const share = total ? country.count / total : 0;
        return {
          location: [centroid.lat, centroid.lon] as [number, number],
          // Floor the size so a low-traffic country is still visible — without
          // this, a site with one dominant country looks like an empty globe
          size: Math.max(0.045, Math.min(0.12, 0.03 + share * 0.14)),
        };
      })
      .filter((m): m is { location: [number, number]; size: number } =>
        Boolean(m)
      );

    const canvas = canvasRef.current;
    let width = 0;
    const onResize = () => {
      width = canvas.offsetWidth;
    };
    onResize();
    window.addEventListener("resize", onResize);

    // cobe's documented defaults, with only the marker colour changed to our
    // accent. Deviating from these is what produced the unlit black orb.
    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.13, 0.83, 0.93], // cyan-500, matching the dashboard accent
      glowColor: [1, 1, 1],
      markers,
      onRender: (state) => {
        if (autoRotateRef.current) phiRef.current += 0.003;
        state.phi = phiRef.current + dragOffsetRef.current;
        state.width = width * 2;
        state.height = width * 2;
      },
    });

    // Fade in once the first frame has painted, avoiding a flash of blank canvas
    const raf = requestAnimationFrame(() => {
      canvas.style.opacity = "1";
    });

    return () => {
      globe.destroy();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webglReady, markerKey, total]);

  // Move/up live on the window, not the canvas: a drag that leaves the canvas
  // (easy to do on a 440px circle) must keep tracking, and must still end when
  // the button is released anywhere on the page.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragStartRef.current === null) return;
      dragOffsetRef.current = (e.clientX - dragStartRef.current) / 200;
    };

    const onUp = () => {
      if (dragStartRef.current === null) return;
      dragStartRef.current = null;
      autoRotateRef.current = true;
      if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragStartRef.current = e.clientX - dragOffsetRef.current * 200;
    autoRotateRef.current = false;
    e.currentTarget.style.cursor = "grabbing";
  };

  const hasGeo = countries.some((c) => lookupCentroid(String(c.group)));

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* The globe column is sized to the globe itself rather than 1fr —
            stretching it left dead space on either side of the canvas. The
            list takes the remainder, which suits it: it's the readable half. */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,360px)_1fr]">
          {/* Globe */}
          <div className="relative flex flex-col items-center justify-center gap-4 p-5">
            {webglReady && hasGeo ? (
              <>
                <canvas
                  ref={canvasRef}
                  onPointerDown={onPointerDown}
                  className="w-full max-w-[300px] aspect-square opacity-0 transition-opacity duration-700 cursor-grab"
                  // touch-action:none stops the browser claiming horizontal
                  // drags for scrolling, which would swallow the gesture on
                  // touch devices
                  style={{ touchAction: "none" }}
                />
                <p className="text-xs text-muted-foreground text-center">
                  {countries.length}{" "}
                  {countries.length === 1 ? "country" : "countries"} · drag to
                  spin
                </p>
              </>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-16 px-6">
                {webglReady === null
                  ? null
                  : hasGeo
                  ? "3D globe unavailable in this browser — showing the ranked list."
                  : "No location data for this period yet."}
              </div>
            )}
          </div>

          {/* Ranked list — the readable half of the pairing */}
          <div className="border-t lg:border-t-0 lg:border-l border-stone-800/60 p-4">
            <div className="flex items-baseline justify-between px-3 mb-2">
              <span className="text-sm font-medium">Countries</span>
              <span className="text-xs text-muted-foreground">
                {total} {total === 1 ? "view" : "views"}
              </span>
            </div>
            <ShareBarList
              data={data}
              groupBy="countries"
              limit={8}
              emptyLabel="No location data for this period"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GlobeCard;
