// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Column, DataTable, type TableRow } from "./data-table";
import { ShellProvider } from "./view-state";

afterEach(cleanup);

const push = vi.fn();
const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/aivia/pages",
  useSearchParams: () => new URLSearchParams(search),
}));

const columns: Column[] = [
  { key: "visitors", header: "Visitors", align: "right", width: "90px" },
  {
    key: "bounce",
    header: "Bounce",
    align: "right",
    width: "70px",
    lowerIsBetter: true,
    secondary: true,
  },
];
const rows: TableRow[] = [
  {
    id: "/",
    label: "/",
    cells: { visitors: 4490, bounce: 38 },
    previous: { visitors: 4120, bounce: 35 },
  },
  {
    id: "/pricing",
    label: "/pricing",
    cells: { visitors: 2610, bounce: 31 },
    previous: { visitors: 2290, bounce: 33 },
  },
  {
    id: "Chrome",
    label: "Chrome",
    cells: { visitors: 6980, bounce: 30 },
    children: [
      {
        id: "Chrome 128",
        label: "128",
        childPrefix: "Chrome, version",
        cells: { visitors: 3990, bounce: 30 },
      },
    ],
  },
];

function setup(
  query: string,
  props: Partial<Parameters<typeof DataTable>[0]> = {}
) {
  search = query;
  return render(
    <ShellProvider>
      <DataTable
        region="pages"
        title="Pages"
        columns={columns}
        rows={rows}
        defaultSort={{ col: "visitors", dir: "desc" }}
        views={[
          { key: "top", label: "Top" },
          { key: "entry", label: "Entry" },
        ]}
        total={128}
        exportName="pages"
        {...props}
      />
    </ShellProvider>
  );
}

describe("DataTable", () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
  });

  it("sorts by the default column, marks every header with aria-sort, and names the next action", () => {
    setup("");
    const headers = screen.getAllByRole("columnheader");
    expect(headers[1]).toHaveAttribute("aria-sort", "descending");
    expect(headers[2]).toHaveAttribute("aria-sort", "none");
    expect(
      screen.getByRole("button", {
        name: "Visitors, sorted descending, activate to sort ascending",
      })
    ).toBeInTheDocument();
    const labels = screen
      .getAllByRole("row")
      .slice(1)
      .map((r) => r.querySelector("[data-row]")?.getAttribute("data-row"));
    expect(labels).toEqual(["Chrome", "/", "/pricing"]);
  });

  it("writes the sort to the URL with replace and announces it", async () => {
    setup("");
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /Bounce, not sorted/ })
    );
    expect(replace).toHaveBeenCalledWith("/aivia/pages?sort.pages=-bounce");
  });

  it("renders the views as a tablist of links and the selected row as aria-current", () => {
    setup("view.pages=entry&sel=%2Fpricing", { selectedId: "/pricing" });
    const tabs = screen.getAllByRole("tab");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("href", "?view.pages=entry&sel=%2Fpricing");
    const row = screen
      .getByRole("button", { name: /^\/pricing/ })
      .closest("tr");
    expect(row).toHaveAttribute("aria-current", "true");
  });

  it("gives the rows one tab stop, moves with arrows, and maps Enter and F to the callbacks", async () => {
    const onSelect = vi.fn();
    const onFilter = vi.fn();
    setup("", { onSelect, onFilter });
    const buttons = screen.getAllByRole("button", {
      name: /press Enter to select/,
    });
    expect(
      buttons.filter((b) => b.getAttribute("tabindex") === "0")
    ).toHaveLength(1);
    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: "ArrowDown" });
    expect(document.activeElement).toHaveAttribute("data-row", "/");
    fireEvent.keyDown(document.activeElement as Element, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "/" }));
    fireEvent.keyDown(document.activeElement as Element, { key: "f" });
    expect(onFilter).toHaveBeenCalledWith(expect.objectContaining({ id: "/" }));
    fireEvent.keyDown(document.activeElement as Element, {
      key: "Enter",
      shiftKey: true,
    });
    expect(onFilter).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("button", { name: "Filter by /" })
    ).toBeInTheDocument();
  });

  it("expands sub-rows with a prefixed name and shows deltas when compare is on", async () => {
    setup("", { compare: true });
    const user = userEvent.setup();
    expect(screen.queryByText("128")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Expand Chrome" }));
    expect(
      await screen.findByRole("button", { name: /Chrome, version 128/ })
    ).toBeInTheDocument();
    expect(screen.getByText("+9.0%")).toBeInTheDocument(); // 4490 vs 4120
    expect(screen.getByText("+8.6%")).toHaveClass("text-poor"); // bounce up is bad
  });

  it("shows the footer with the count and the export", () => {
    setup("");
    expect(screen.getByText("128 rows")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Export CSV" })
    ).toBeInTheDocument();
  });
});
