import { describe, expect, it } from "vitest";
import { normaliseHostname } from "./hostnames";
import { HOSTNAME_CASES } from "./hostnames.cases";

describe("normaliseHostname", () => {
  it.each(HOSTNAME_CASES)("%s -> %s", (input, expected) => {
    expect(normaliseHostname(input)).toBe(expected);
  });
});
