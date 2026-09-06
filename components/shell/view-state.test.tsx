// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

import type { Filter } from "@/lib/query/filters";
import {
  ShellProvider,
  useAnnounce,
  useViewState,
  withFilterSummary,
} from "./view-state";
import { VisitorTotal } from "./visitor-total";

let search = "";
const push = vi.fn((url: string) => {
  search = url.split("?")[1] ?? "";
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/aivia",
  useSearchParams: () => new URLSearchParams(search),
}));

function Probe() {
  const { state, update } = useViewState();
  const announce = useAnnounce();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          update({
            ...state,
            filters: [
              ...state.filters,
              { dimension: "path", op: "is", values: ["/pricing"] },
            ],
          });
          announce("Added Page is /pricing.");
        }}
      >
        add
      </button>
      <button
        type="button"
        onClick={() => {
          update({ ...state, range: "last_7d" });
          announce("Range Last 7 days.");
        }}
      >
        range
      </button>
    </>
  );
}

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 80));
  });
}

describe("withFilterSummary", () => {
  it("appends the count and the visitor total as design §6 words them", () => {
    const filters: Filter[] = [
      { dimension: "country", op: "is", values: ["CA", "US"] },
      { dimension: "device", op: "is", values: ["mobile"] },
    ];
    expect(withFilterSummary("Removed Page is /pricing.", filters, 3201)).toBe(
      "Removed Page is /pricing. 3 filters. 3,201 visitors."
    );
    expect(
      withFilterSummary("Added Page is /pricing.", [filters[1]], null)
    ).toBe("Added Page is /pricing. 1 filter.");
    expect(withFilterSummary("Cleared all filters.", [], 12480)).toBe(
      "Cleared all filters. 12,480 visitors."
    );
  });
});

describe("ShellProvider announcements", () => {
  it("adds the count and the page's visitor total when the filters changed", async () => {
    search = "f=country:is:CA";
    const view = render(
      <ShellProvider>
        <VisitorTotal value={3201} />
        <Probe />
      </ShellProvider>
    );
    screen.getByText("add").click();
    expect(push).toHaveBeenCalled();
    view.rerender(
      <ShellProvider>
        <VisitorTotal value={3201} />
        <Probe />
      </ShellProvider>
    );
    await settle();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Added Page is /pricing. 2 filters. 3,201 visitors."
    );
  });

  it("leaves other announcements alone", async () => {
    search = "f=country:is:CA";
    const view = render(
      <ShellProvider>
        <VisitorTotal value={3201} />
        <Probe />
      </ShellProvider>
    );
    screen.getByText("range").click();
    view.rerender(
      <ShellProvider>
        <VisitorTotal value={3201} />
        <Probe />
      </ShellProvider>
    );
    await settle();
    expect(screen.getByRole("status")).toHaveTextContent("Range Last 7 days.");
    expect(screen.getByRole("status")).not.toHaveTextContent("filter");
  });
});
