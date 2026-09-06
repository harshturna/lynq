import { describe, expect, it } from "vitest";
import { validateNote } from "./validate";

const now = new Date("2026-09-06T12:00:00Z");

describe("validateNote", () => {
  it("trims and collapses the text, and defaults the instant to now", () => {
    const r = validateNote({ text: "  Deployed   v2 \n" }, now);
    expect(r).toEqual({ ok: true, note: { text: "Deployed v2", at: now } });
  });
  it("reads an ISO string or epoch milliseconds", () => {
    expect(
      validateNote({ text: "x", at: "2026-09-01T10:00:00Z" }, now)
    ).toMatchObject({
      ok: true,
      note: { at: new Date("2026-09-01T10:00:00Z") },
    });
    expect(
      validateNote({ text: "x", at: Date.parse("2026-09-01T10:00:00Z") }, now)
    ).toMatchObject({
      ok: true,
    });
  });
  it("refuses an empty note, a long one, an unreadable date and a far one", () => {
    expect(validateNote({ text: "   " }, now)).toMatchObject({ ok: false });
    expect(validateNote({ text: "a".repeat(141) }, now)).toMatchObject({
      ok: false,
      error: expect.stringContaining("140"),
    });
    expect(validateNote({ text: "x", at: "yesterday" }, now)).toMatchObject({
      ok: false,
    });
    expect(
      validateNote({ text: "x", at: "2000-01-01T00:00:00Z" }, now)
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining("10 years"),
    });
  });
});
