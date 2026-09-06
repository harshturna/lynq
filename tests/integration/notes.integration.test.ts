import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { QueryContext } from "@/lib/query/primitives";

/** TICKET-076: a note is pinned to one site, read inside the range, and removed only by its site. */
process.env.LYNQ_DB_POOLER_URL = process.env.TEST_DATABASE_URL;

let sql: postgres.Sql;
let siteId: number;
let otherId: number;
let db: typeof import("@/lib/notes/db");
let q: typeof import("@/lib/query/run");

beforeAll(async () => {
  sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
  });
  const rows = await sql<{ id: number }[]>`
    insert into public.websites (name, url, user_id, slug)
    values ('notes', 'notes-test.example', gen_random_uuid(), 'notes-test'),
           ('notes other', 'notes-other.example', gen_random_uuid(), 'notes-other')
    returning id`;
  siteId = Number(rows[0].id);
  otherId = Number(rows[1].id);
  db = await import("@/lib/notes/db");
  q = await import("@/lib/query/run");
});

afterAll(async () => {
  await sql`delete from public.websites where id in (${siteId}, ${otherId})`;
  const { sql: appSql } = await import("@/lib/db");
  await appSql.end();
  await sql.end();
});

describe("notes", () => {
  it("are read inside the range, oldest first, and never from another site", async () => {
    const at = (d: string) => new Date(d);
    await db.insertNote({
      siteId,
      at: at("2026-09-03T10:00:00Z"),
      text: "Later",
      author: "a@b.c",
    });
    await db.insertNote({
      siteId,
      at: at("2026-09-01T10:00:00Z"),
      text: "Earlier",
      author: "key:CI",
    });
    await db.insertNote({
      siteId,
      at: at("2026-08-01T10:00:00Z"),
      text: "Out of range",
      author: "",
    });
    await db.insertNote({
      siteId: otherId,
      at: at("2026-09-02T10:00:00Z"),
      text: "Other site",
      author: "",
    });
    const ctx: QueryContext = {
      siteId,
      range: {
        from: at("2026-09-01T00:00:00Z"),
        toExclusive: at("2026-09-08T00:00:00Z"),
      },
      timezone: "UTC",
      filters: [],
    };
    const notes = await q.notes(ctx);
    expect(notes.map((n) => [n.text, n.author])).toEqual([
      ["Earlier", "key:CI"],
      ["Later", "a@b.c"],
    ]);
  });

  it("refuses a text outside 1 to 140 characters at the table", async () => {
    await expect(
      db.insertNote({ siteId, at: new Date(), text: "", author: "" })
    ).rejects.toThrow(/check/);
    await expect(
      db.insertNote({
        siteId,
        at: new Date(),
        text: "x".repeat(141),
        author: "",
      })
    ).rejects.toThrow(/check/);
  });

  it("is removed only through its own site", async () => {
    const { id } = await db.insertNote({
      siteId,
      at: new Date(),
      text: "Mine",
      author: "",
    });
    expect(await db.removeNote(otherId, id)).toBe(false);
    expect(await db.removeNote(siteId, id)).toBe(true);
    expect(await db.removeNote(siteId, id)).toBe(false);
  });
});
