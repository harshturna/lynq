# Notes on charts

**Status:** designed (TICKET-076)
**Written:** 2026-09-06
**Ticket:** TICKET-076 · **Keys:** D-017

## 1. Why

A chart shows that something changed and never why. The owner knows they shipped v2 on Tuesday
or were on Product Hunt on Thursday; the chart does not, and a week later neither do they. A
note is a dated sentence pinned to the site so that every time chart can show it where it
happened, and a deploy pipeline can pin the same sentence without a person doing it.

## 2. Shape

```
owner (Overview, Goals)  ──▶  server action  ──▶  public.notes  ◀──  POST /api/notes  ◀──  CI, an agent
                                                      │                  key with the notes scope
                                                      ▼
                                       every time chart in the range
```

One table, one read per screen, two writers. Notes belong to a site and carry an instant, a
sentence, and who wrote it (an email for a person, the key's name for a key).

## 3. What is stored

`public.notes`:

| Column | |
|---|---|
| `id`, `site_id` | |
| `at` | the instant the note marks; `timestamptz`, chosen by the writer, defaults to now |
| `text` | up to 140 characters; a sentence, not a document |
| `author` | the owner's email, or `key:<name>` when written through a key |
| `created_at`, `updated_at` | |

RLS like `public.goals`: owner all, `anon`/`authenticated` revoked, read through postgres.js.
Deleted with the site (cascade). A note is edited in place and deleted outright; there is no
history, because a note is small enough to retype.

## 4. Where a note shows

On the two charts that answer "what happened": the Overview lead chart and a goal's completions
trend. Both take the notes that fall inside the current range and draw one **marker per
bucket**: a short vertical tick from the axis in ink, a 6 px dot at the top, and the note's
first words as a label when there is room. A bucket with two or more notes shows one marker
labelled "2 notes". The tooltip that already shows the bucket's values gains the notes' text
beneath them, and the hidden table gains a Notes column, so a screen reader hears them where a
sighted reader sees them.

Nothing about the series changes. A marker is a `markLine` on the primary series, silent,
placed on the category axis at the bucket the note falls in (`bucketIndexOf(at)`); a note
outside the range is not drawn and not sent to the client.

Performance, Pages and Events keep their charts as they are. Notes exist to explain a change
in the numbers that matter most; a note on a Web Vitals trend can come later if it is wanted.

## 5. Adding, editing, deleting

**Add** from the chart: a small "Add note" control in the section's right slot opens a popover
(the goal form's pattern) with a date and time, defaulting to now in the site's timezone, and
the text. **Edit and delete** from the list under **Settings → Notes**, which shows every note
with its date and author and is where a key's notes are reviewed; the chart's right slot links
there with the count ("3 notes"). A link inside an ECharts tooltip needs the tooltip to be
enterable and is easy to miss, so editing does not live in the tooltip.

The guest account cannot write notes, with the same one-sentence refusal as goals.

## 6. The API

`POST /api/notes`, `Authorization: Bearer <key>` with the `notes` scope (D-017), body
`{ text, at? }`. Returns `201 { id, at }`. Refused on a browser Origin, like `/api/bots`. Rate
limited by the same in-memory limiter until TICKET-086. The key's name becomes the author, so
the settings list says "key: Deploy pipeline".

Also `DELETE /api/notes/:id` with the same key, for a pipeline that wants to retract a
mis-dated note. No listing endpoint: reading is TICKET-078's job.

## 7. Out of scope

Notes on every chart; a note attached to a page or a goal rather than a site; a history of
edits; provider integrations (Vercel, GitHub) that would write notes without the owner's key,
which the owner ruled out in favour of one API any pipeline can call.
