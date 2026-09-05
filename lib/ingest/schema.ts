import { z } from "zod";

/**
 * The v2 batch envelope (design §7.1). Unknown fields are stripped, not
 * rejected, so an older server accepts a newer tracker. Values the design
 * caps are capped here or in rows.ts, never rejected, except for shape.
 */
const hex16 = z.string().regex(/^[0-9a-f]{16}$/);
const ts = z.number().int().nonnegative();
const seq = z.number().int().nonnegative();

const numericRecord = z
  .record(z.unknown())
  .transform((m) =>
    Object.fromEntries(
      Object.entries(m).filter(
        (e): e is [string, number] =>
          typeof e[1] === "number" && Number.isFinite(e[1])
      )
    )
  );

export const eventSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("pageview"), ts, seq }),
  z.object({
    t: z.literal("engagement"),
    ts,
    seq,
    ms: z.number().int().min(0).max(3_600_000),
    scroll: z.number().int().min(0).max(100).optional(),
  }),
  z.object({
    t: z.literal("custom"),
    ts,
    seq,
    name: z.string().min(1).max(64),
    props: z.record(z.unknown()).optional(),
  }),
  z.object({
    t: z.literal("vitals"),
    ts,
    seq,
    m: numericRecord,
    targets: z.record(z.string().max(256)).optional(),
  }),
  z.object({ t: z.literal("identify"), ts, seq }),
]);

export const batchSchema = z.object({
  v: z.literal(2),
  site: z.string().max(253),
  sid: hex16,
  pid: hex16,
  uid: z.string().min(1).max(128).optional(),
  page: z.object({
    url: z.string().min(1).max(4096),
    title: z.string().max(2048).optional(),
  }),
  session: z
    .object({
      ref: z.string().max(4096).optional(),
      url: z.string().max(4096).optional(),
    })
    .optional(),
  ctx: z
    .object({
      sw: z.number().int().min(0).max(65535).optional(),
      sh: z.number().int().min(0).max(65535).optional(),
      lang: z.string().max(35).optional(),
    })
    .optional(),
  events: z.array(eventSchema).min(1).max(20),
});

export type Batch = z.infer<typeof batchSchema>;
export type BatchEvent = z.infer<typeof eventSchema>;
