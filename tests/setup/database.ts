import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

/**
 * Applies the production schema dump and every migration, in order, to the
 * test database before the integration suite runs. The database is the
 * Supabase Postgres image (roles, auth schema and extensions present), so the
 * same files that `supabase db push` applies in production apply here.
 *
 * A ledger, analytics.schema_migrations(version), records what has run so a
 * warm container picks up a new migration file (design §11): without it a
 * new migration never ran once the analytics schema existed and the suite
 * passed against the old schema.
 */
// supabase/schema.sql is a dump of production and already contains every
// migration applied before it was taken; bump this whenever it is re-exported.
export const DUMP_INCLUDES_MIGRATIONS_THROUGH = "20260905050000";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  const sql = postgres(url, { max: 1, prepare: false });
  const root = process.cwd();
  const dir = path.join(root, "supabase", "migrations");
  const versions = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  try {
    const [{ dumped, analytics }] = await sql`
      select exists(select 1 from pg_tables where schemaname = 'public' and tablename = 'websites') as dumped,
             exists(select 1 from pg_namespace where nspname = 'analytics') as analytics`;
    if (!dumped) {
      await sql.unsafe(
        readFileSync(path.join(root, "supabase", "schema.sql"), "utf8")
      );
      // pg_dump writes ACLs relative to Postgres' built-in defaults, not to
      // the image's ALTER DEFAULT PRIVILEGES, so a privilege a migration
      // revoked from a default-privilege grant is re-granted when the dump
      // creates the table. Re-apply those revokes here; production has them.
      await sql.unsafe("revoke all on public.goals from anon, authenticated");
    }
    const [{ ledger }] = await sql`
      select exists(select 1 from pg_tables where schemaname = 'analytics' and tablename = 'schema_migrations') as ledger`;
    if (!ledger) {
      await sql`create schema if not exists analytics`;
      await sql`create table analytics.schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now())`;
      // Everything the dump contains counts as applied. A container that
      // already had the analytics schema before the ledger existed replayed
      // exactly those files, so the same rows are right for it.
      const inDump = versions.filter(
        (f) => f.slice(0, 14) <= DUMP_INCLUDES_MIGRATIONS_THROUGH
      );
      if (!dumped || analytics)
        for (const f of inDump)
          await sql`insert into analytics.schema_migrations (version) values (${f.slice(0, 14)})`;
    }
    const applied = new Set(
      (
        await sql<
          { version: string }[]
        >`select version from analytics.schema_migrations`
      ).map((r) => r.version)
    );
    for (const f of versions) {
      const v = f.slice(0, 14);
      if (applied.has(v)) continue;
      if (v <= DUMP_INCLUDES_MIGRATIONS_THROUGH && dumped && !analytics)
        continue; // never reached: the dump path above records these
      await sql.begin(async (tx) => {
        await tx.unsafe(readFileSync(path.join(dir, f), "utf8"));
        await tx`insert into analytics.schema_migrations (version) values (${v})`;
      });
    }
  } finally {
    await sql.end();
  }
}
