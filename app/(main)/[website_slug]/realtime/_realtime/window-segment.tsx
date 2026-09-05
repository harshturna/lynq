"use client";

import { Segmented } from "@/components/shell/control";
import { useViewState } from "@/components/shell/view-state";
import { withView } from "@/lib/url-state";

/** Last 30 min / Last hour, in place of the range picker (design §8.2). */
export function WindowSegment() {
  const { state, update } = useViewState();
  const value = state.view.realtime === "hour" ? "hour" : "half";
  return (
    <Segmented<"half" | "hour">
      label="Window"
      options={[
        { value: "half", label: "Last 30 min" },
        { value: "hour", label: "Last hour" },
      ]}
      value={value}
      onChange={(v) =>
        update(withView(state, "realtime", v), { replace: true })
      }
    />
  );
}
