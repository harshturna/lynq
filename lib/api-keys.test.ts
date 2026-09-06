import { describe, expect, it } from "vitest";
import { isScope } from "./api-key-scopes";
import { bearerToken, generateToken, hashToken } from "./api-keys";

describe("api keys", () => {
  it("mints a prefixed token whose prefix identifies it but cannot use it", () => {
    const { token, prefix } = generateToken();
    expect(token).toMatch(/^lynq_sk_[0-9a-f]{48}$/);
    expect(prefix).toBe(token.slice(0, 16));
    expect(token.startsWith(prefix)).toBe(true);
    expect(prefix.length).toBeLessThan(token.length / 2);
    expect(generateToken().token).not.toBe(token);
  });

  it("hashes to a stable 32 bytes, and a different token to a different hash", () => {
    const a = generateToken().token;
    expect(hashToken(a)).toHaveLength(32);
    expect(hashToken(a).equals(hashToken(a))).toBe(true);
    expect(hashToken(a).equals(hashToken(generateToken().token))).toBe(false);
  });

  it("knows its scopes", () => {
    expect(isScope("read")).toBe(true);
    expect(isScope("ingest")).toBe(true);
    expect(isScope("admin")).toBe(false);
  });

  it("reads a bearer token and nothing else", () => {
    const h = (v: string | null) => ({ get: () => v });
    expect(bearerToken(h("Bearer lynq_sk_abc"))).toBe("lynq_sk_abc");
    expect(bearerToken(h("bearer lynq_sk_abc"))).toBe("lynq_sk_abc");
    expect(bearerToken(h("Basic lynq_sk_abc"))).toBeNull();
    expect(bearerToken(h("Bearer   "))).toBeNull();
    expect(bearerToken(h(null))).toBeNull();
  });
});
