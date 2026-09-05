// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

import { Calendar } from "./calendar";

describe("Calendar", () => {
  const today = "2026-09-05";

  it("is a grid named with the month and timezone, marks today and the range", () => {
    render(
      <Calendar
        timezone="America/Toronto"
        today={today}
        from="2026-08-30"
        to="2026-09-03"
        onChange={() => {}}
      />
    );
    expect(
      screen.getByRole("table", {
        name: "September 2026, dates in America/Toronto",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Saturday, September 5, 2026" })
    ).toHaveAttribute("aria-current", "date");
    expect(
      screen.getByRole("button", { name: "Tuesday, September 1, 2026" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Sunday, September 6, 2026" })
    ).toBeDisabled(); // the future
  });

  it("moves focus with the arrow keys and the month with PageUp", async () => {
    render(<Calendar timezone="UTC" today={today} onChange={() => {}} />);
    const user = userEvent.setup();
    const start = screen.getByRole("button", {
      name: "Saturday, September 5, 2026",
    });
    expect(start).toHaveAttribute("tabindex", "0");
    start.focus();
    await user.keyboard("{ArrowLeft}");
    expect(
      screen.getByRole("button", { name: "Friday, September 4, 2026" })
    ).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(
      screen.getByRole("button", { name: "Friday, August 28, 2026" })
    ).toHaveFocus();
    expect(
      screen.getByRole("table", { name: /August 2026/ })
    ).toBeInTheDocument();
    await user.keyboard("{PageUp}");
    expect(
      screen.getByRole("table", { name: /July 2026/ })
    ).toBeInTheDocument();
    await user.keyboard("{Home}");
    expect(
      screen.getByRole("button", { name: "Monday, July 27, 2026" })
    ).toHaveFocus();
  });

  it("selects a start then an end, announcing each step", async () => {
    const onChange = vi.fn();
    const announce = vi.fn();
    render(
      <Calendar
        timezone="UTC"
        today={today}
        onChange={onChange}
        announce={announce}
      />
    );
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Tuesday, September 1, 2026" })
    );
    expect(onChange).toHaveBeenLastCalledWith({ from: "2026-09-01" });
    expect(announce).toHaveBeenLastCalledWith(
      "Start Sep 1 selected. Choose an end date."
    );
  });

  it("completes the range on the second pick", async () => {
    const onChange = vi.fn();
    render(
      <Calendar
        timezone="UTC"
        today={today}
        from="2026-09-01"
        onChange={onChange}
      />
    );
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Thursday, September 3, 2026" })
    );
    expect(onChange).toHaveBeenLastCalledWith({
      from: "2026-09-01",
      to: "2026-09-03",
    });
  });
});
