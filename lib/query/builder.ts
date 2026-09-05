/**
 * Minimal parameter collector. Every value goes through `p()` and comes back
 * as a `$n` placeholder; column names come only from the allow-lists in
 * filters.ts. The result is `{ text, params }` for postgres.js `unsafe`.
 */
export class Query {
  readonly params: unknown[] = [];
  p(value: unknown): string {
    this.params.push(value);
    return `$${this.params.length}`;
  }
}

export type Compiled = { text: string; params: unknown[] };

/** Escape LIKE metacharacters in a user value; the pattern adds its own wildcards. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
