# Visitor journeys

**Status:** designed (TICKET-074)
**Written:** 2026-09-06
**Ticket:** TICKET-074 · **Keys:** D-003 (daily visitor ids)

## 1. Why

Every screen counts. The session drawer, reached today from a Realtime row and an event's
recent occurrences, is the one place Lynq shows what one visit actually did. The two questions
it is not yet reachable from are the ones people ask most: *what did the people who converted
do*, and *what did the people on this page do next*. Journeys are those two doors, plus one
more step inside the drawer: the same visitor's other sessions that day.

## 2. What exists

`session=<visitor>:<session>` on any screen opens the drawer (`components/shell/session-drawer.tsx`)
over the current page; `lib/screens/session.ts` folds the session's rows into pageviews with
engaged time and scroll depth, and custom events with their properties. Realtime's feed and
the Events screen's recent occurrences open it. Nothing else does, and nothing lists sessions.

## 3. What this adds

**A session list**, one component, used in two places:

- **Goals, the selected goal:** "Converting sessions", the newest sessions that completed the
  goal, so the funnel's last number has faces.
- **Pages, the selected page:** "Recent sessions on this page", the newest sessions that
  viewed it, so "what did they do next" is one click.

A row shows when the session started (relative), country and device, the entry page and the
exit page when they differ, the page count, engaged time, and a **Session** button that opens
the drawer exactly as Realtime's rows do. Twenty rows, newest first, the range and the filters
of the screen applying. A converting session is one containing a goal completion; the rows
query gains a `goal` option that adds the goal's predicate to the session CTE's `HAVING`, so
the screen's own filters still apply on top.

**Inside the drawer: "Also today".** The same visitor's other sessions in the same UTC day,
newest first, each a row of the same shape; choosing one swaps the drawer to it (the URL
replaced, not pushed, so Back still closes the drawer). An anonymous visitor's id changes at
midnight UTC (D-003), so a day is the whole story Lynq can tell; the drawer says so in one line
when the list is empty.

## 4. What it does not add

A journeys screen or a sessions table: a list of all sessions is a privacy surface Lynq does
not want, and the question is always "these people", never "everyone". Cross-day journeys for
identified users: the user hash could join them, but showing a person's history across days is
a different promise and needs its own decision. Any change to what is collected.

## 5. Docs and landing

A Using Lynq page, **Journeys**: what a session shows, the four doors (Realtime, Events,
Goals, Pages), "Also today", and the one-day limit. Counting's Sessions section and the Goals
page link it. The landing gains a staged panel: one timeline with an event pill and the
"Also today" line.
