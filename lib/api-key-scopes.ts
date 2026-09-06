/**
 * What an API key may do (D-017). Kept apart from lib/api-keys.ts, which is
 * server-only: the settings screen is a client component and needs the labels
 * without pulling in node:crypto or the database client.
 */
export const SCOPES = ["ingest", "notes", "read"] as const;
export type Scope = (typeof SCOPES)[number];

export const SCOPE_LABEL: Record<Scope, string> = {
  ingest: "Send events from a server",
  notes: "Write notes on charts",
  read: "Read this site's analytics",
};

export function isScope(value: string): value is Scope {
  return (SCOPES as readonly string[]).includes(value);
}
