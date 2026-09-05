import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

/**
 * Applies the production schema dump and every migration, in order, to an
 * empty database before the integration suite runs. The database is the
 * Supabase Postgres image (roles, auth schema and extensions present), so the
 * same files that `supabase db push` applies in production apply here.
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  const sql = postgres(url, { max: 1, prepare: false });
  const root = process.cwd();
  // supabase/schema.sql is a dump of production and already contains every
  // migration applied before it was taken; only newer migrations are replayed.
  const DUMP_INCLUDES_MIGRATIONS_THROUGH = "20260905020000";
  const files = [
    path.join(root, "supabase", "schema.sql"),
    ...readdirSync(path.join(root, "supabase", "migrations"))
      .filter(
        (f) =>
          f.endsWith(".sql") &&
          f.slice(0, 14) > DUMP_INCLUDES_MIGRATIONS_THROUGH
      )
      .sort()
      .map((f) => path.join(root, "supabase", "migrations", f)),
  ];
  try {
    const [{ dumped, applied }] = await sql`
      select exists(select 1 from pg_tables where schemaname = 'public' and tablename = 'websites') as dumped,
             exists(select 1 from pg_namespace where nspname = 'analytics') as applied`;
    if (!dumped) await sql.unsafe(readFileSync(files[0], "utf8"));
    if (!applied) {
      for (const file of files.slice(1))
        await sql.unsafe(readFileSync(file, "utf8"));
    }
  } finally {
    await sql.end();
  }
}
