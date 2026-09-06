// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

import { type Command, CommandMenu, matches, rank } from "./command-menu";
import { ShellProvider } from "./view-state";

const push = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/aivia",
  useSearchParams: () => new URLSearchParams(search),
}));

const SITE = { slug: "aivia", name: "Aivia", url: "aivia.example" };
const SITES = [SITE, { slug: "other", name: "Other", url: "other.example" }];

function setup(query = "") {
  search = query;
  return render(
    <ShellProvider>
      <CommandMenu site={SITE} sites={SITES} enabled />
    </ShellProvider>
  );
}

const command = (over: Partial<Command> = {}): Command => ({
  id: "x",
  group: "Go to",
  label: "Pages",
  run: () => {},
  ...over,
});

describe("matching", () => {
  it("needs every word, in the label, the keywords or the group", () => {
    expect(matches(command(), "")).toBe(true);
    expect(matches(command(), "pag")).toBe(true);
    expect(matches(command(), "PAG")).toBe(true);
    expect(matches(command(), "go pag")).toBe(true);
    expect(matches(command(), "pages sources")).toBe(false);
    expect(matches(command({ keywords: "screen" }), "screen")).toBe(true);
  });
  it("ranks a label that starts with the query first", () => {
    expect(rank(command({ label: "Pages" }), "pag")).toBeLessThan(
      rank(command({ label: "Entry pages" }), "pag")
    );
    expect(rank(command({ label: "Copy link" }), "zzz")).toBe(2);
  });
});

describe("CommandMenu", () => {
  beforeEach(() => {
    push.mockClear();
    localStorage.clear();
  });

  it("opens on the button, filters as you type, and runs on Enter", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "⌘K" }));
    const input = screen.getByRole("combobox");
    expect(input).toHaveFocus();
    await user.type(input, "sourc");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Sources");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/aivia/sources");
  });

  it("moves the selection with the arrow keys and wraps", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "⌘K" }));
    const selected = () =>
      screen
        .getAllByRole("option")
        .findIndex((o) => o.getAttribute("aria-selected") === "true");
    expect(selected()).toBe(0);
    await user.keyboard("{ArrowDown}");
    expect(selected()).toBe(1);
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(selected()).toBe(screen.getAllByRole("option").length - 1);
  });

  it("says so when nothing matches", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "⌘K" }));
    await user.type(screen.getByRole("combobox"), "zzzzz");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
  });

  it("offers a filter's removal only while the filter is on", async () => {
    setup("f=country:is:CA");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "⌘K" }));
    await user.type(screen.getByRole("combobox"), "remove");
    expect(
      screen.getByRole("option", { name: /Remove Country is/ })
    ).toBeInTheDocument();
  });

  it("remembers what was run and offers it first next time", async () => {
    const view = setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "⌘K" }));
    await user.type(screen.getByRole("combobox"), "sourc");
    await user.keyboard("{Enter}");
    expect(
      JSON.parse(localStorage.getItem("lynq_command_recents") ?? "[]")
    ).toEqual(["go:sources"]);
    view.rerender(
      <ShellProvider>
        <CommandMenu site={SITE} sites={SITES} enabled />
      </ShellProvider>
    );
    await user.click(screen.getByRole("button", { name: "⌘K" }));
    await act(async () => {});
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("Sources");
    // and never twice: the Go to group no longer repeats it
    expect(
      options.filter((o) => o.textContent?.includes("Sources"))
    ).toHaveLength(1);
  });
});
