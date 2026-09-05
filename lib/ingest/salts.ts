import "server-only";
import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { createSaltCache, type SaltLoader } from "./salt-cache";

/** Insert-on-conflict then read, so two cold starts agree on one salt. */
export const loadSaltFromDatabase: SaltLoader = async (day) => {
  const fresh = randomBytes(32);
  await sql`
    insert into analytics.visitor_salts (day, salt) values (${day}, ${fresh})
    on conflict (day) do nothing`;
  const [row] = await sql<{ salt: Buffer }[]>`
    select salt from analytics.visitor_salts where day = ${day}`;
  if (!row) throw new Error(`no salt for ${day}`);
  return row.salt;
};

export const saltFor = createSaltCache(loadSaltFromDatabase);
