"use client";

import { Segmented } from "@/components/shell/control";
import { useAnnounce, useViewState } from "@/components/shell/view-state";
import { type DeviceView, withParam } from "@/lib/url-state";

/** All / desktop / mobile, written to the URL's `device` param (design §8.9). */
export function DeviceSegment() {
  const { state, update } = useViewState();
  const announce = useAnnounce();
  return (
    <Segmented<DeviceView>
      label="Device"
      options={[
        { value: "all", label: "All" },
        { value: "desktop", label: "Desktop" },
        { value: "mobile", label: "Mobile" },
      ]}
      value={state.device ?? "all"}
      onChange={(v) => {
        update(withParam(state, "device", v === "all" ? undefined : v), {
          replace: true,
        });
        announce(v === "all" ? "Showing every device." : `Showing ${v} only.`);
      }}
    />
  );
}
