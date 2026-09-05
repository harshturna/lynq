import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes commas, quotes and newlines, and starts with a BOM", () => {
    const csv = toCsv(
      [
        { key: "label", header: "Page" },
        { key: "n", header: "Visitors" },
      ],
      [
        { label: "/a,b", n: 12 },
        { label: 'say "hi"', n: null },
        { label: "two\nlines", n: 0 },
      ]
    );
    expect(csv).toBe(
      '﻿Page,Visitors\r\n"/a,b",12\r\n"say ""hi""",\r\n"two\nlines",0\r\n'
    );
  });
});
