// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

import { FilterChips } from "./filter-chips";
import { ShellProvider } from "./view-state";

const push = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/aivia",
  useSearchParams: () => new URLSearchParams(search),
}));

function setup(query: string) {
  search = query;
  return render(
    <ShellProvider>
      <FilterChips addButtonId="add" />
      <button type="button" id="add">
        + Filter
      </button>
    </ShellProvider>
  );
}

describe("FilterChips", () => {
  beforeEach(() => push.mockClear());

  it("renders one chip per value with the sentence and the removal key in the name", () => {
    setup("f=country:is:CA|US&f=bounced:is:true");
    const chips = screen.getAllByRole("button", {
      name: /press Delete to remove/,
    });
    expect(chips).toHaveLength(3);
    expect(chips[0]).toHaveAccessibleName(
      "Country is 🇨🇦 Canada, press Delete to remove"
    );
    expect(chips[2]).toHaveAccessibleName(
      "Bounced is Yes, press Delete to remove"
    );
    expect(screen.getByText("(whole sessions)")).toBeInTheDocument();
  });

  it("Delete on a chip pushes the URL without that value and announces the change", async () => {
    setup("f=country:is:CA|US");
    const user = userEvent.setup();
    const [first] = screen.getAllByRole("button", { name: /press Delete/ });
    first.focus();
    await user.keyboard("{Delete}");
    expect(push).toHaveBeenCalledWith("/aivia?f=country%3Ais%3AUS");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Removed Country is 🇨🇦 Canada. 1 filter."
    );
  });

  it("Clear all empties the filters and moves focus to + Filter", async () => {
    setup("f=country:is:CA&f=device:is:mobile");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(push).toHaveBeenCalledWith("/aivia");
    expect(document.getElementById("add")).toHaveFocus();
  });

  it("renders nothing without filters", () => {
    setup("");
    expect(screen.queryByText("Active filters")).toBeNull();
  });
});
