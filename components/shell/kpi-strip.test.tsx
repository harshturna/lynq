// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KpiStrip } from "./kpi-strip";

afterEach(cleanup);

const tiles = [
  { key: "visitors", label: "Unique visitors", value: "12,480" },
  { key: "pageviews", label: "Pageviews", value: "31,905" },
  {
    key: "kpi",
    label: "KPI",
    value: "",
    ghost: { href: "/aivia/goals", text: "Set a KPI" },
  },
];

describe("KpiStrip", () => {
  it("is a radiogroup with one checked tile and arrows moving the choice", () => {
    const onChange = vi.fn();
    render(<KpiStrip tiles={tiles} value="visitors" onChange={onChange} />);
    expect(
      screen.getByRole("radiogroup", { name: "Metric" })
    ).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios[0]).toBeChecked();
    fireEvent.click(radios[1]);
    expect(onChange).toHaveBeenCalledWith("pageviews");
    expect(screen.getByRole("link", { name: "Set a KPI →" })).toHaveAttribute(
      "href",
      "/aivia/goals"
    );
  });
});
