/**
 * The one glob dialect used for excluded paths now and pageview goals in
 * Phase 2 (design §7.3): `*` matches any run of characters including `/`,
 * `?` matches one character, everything else is literal. User-authored
 * regular expressions are never run against the table.
 */
export function globToRegExp(glob: string): RegExp {
  let re = "^";
  for (const ch of glob) {
    if (ch === "*") re += ".*";
    else if (ch === "?") re += ".";
    else re += ch.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  }
  return new RegExp(`${re}$`);
}

export function matchesAnyGlob(
  value: string,
  globs: readonly string[]
): boolean {
  return globs.some((g) => globToRegExp(g).test(value));
}

/** The same glob as a LIKE pattern, for SQL. `_` and `%` in the glob are escaped. */
export function globToLike(glob: string): string {
  let like = "";
  for (const ch of glob) {
    if (ch === "*") like += "%";
    else if (ch === "?") like += "_";
    else if (ch === "%" || ch === "_" || ch === "\\") like += `\\${ch}`;
    else like += ch;
  }
  return like;
}
