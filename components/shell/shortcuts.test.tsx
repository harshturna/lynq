// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

import { useShortcuts } from "./shortcuts";

function Harness({
  enabled,
  onRangeStep,
  onSearch,
}: {
  enabled: boolean;
  onRangeStep: (d: -1 | 1) => void;
  onSearch: () => void;
}) {
  useShortcuts({ enabled, onRangeStep, onSearch });
  return (
    <div>
      <div data-shell-controls>
        <button type="button">Range</button>
      </div>
      <button type="button">Elsewhere</button>
      <input aria-label="Search" />
    </div>
  );
}

describe("useShortcuts", () => {
  it("steps the range only while focus is inside the controls", async () => {
    const step = vi.fn();
    render(<Harness enabled onRangeStep={step} onSearch={() => {}} />);
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    elsewhere.focus();
    fireEvent.keyDown(elsewhere, { key: "[" });
    expect(step).not.toHaveBeenCalled();
    const range = screen.getByRole("button", { name: "Range" });
    range.focus();
    fireEvent.keyDown(range, { key: "]" });
    expect(step).toHaveBeenCalledWith(1);
  });

  it("focuses search with / only when no text field has focus", async () => {
    const search = vi.fn();
    render(<Harness enabled onRangeStep={() => {}} onSearch={search} />);
    const user = userEvent.setup();
    screen.getByRole("button", { name: "Elsewhere" }).focus();
    await user.keyboard("/");
    expect(search).toHaveBeenCalledTimes(1);
    screen.getByRole("textbox", { name: "Search" }).focus();
    await user.keyboard("/");
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled", async () => {
    const step = vi.fn();
    render(<Harness enabled={false} onRangeStep={step} onSearch={() => {}} />);
    const range = screen.getByRole("button", { name: "Range" });
    range.focus();
    fireEvent.keyDown(range, { key: "[" });
    expect(step).not.toHaveBeenCalled();
  });
});
