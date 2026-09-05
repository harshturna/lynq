---
name: ticket
description: Create, start, hand off, or close a task ticket in tickets/. Use whenever work begins, pauses, or finishes.
argument-hint: "new | start | handoff | close  [TICKET-NNN or title]"
allowed-tools: Read Edit Write Bash(ls *) Bash(mv *) Bash(git status) Bash(git diff *) Bash(date *) Bash(npm run *)
---

## Trigger

Run this before any code change (new or start), whenever a session ends with the ticket still open
(handoff), and when the work is finished and verified (close). Discussion-only turns need none of it.

## new

1. Find the highest `TICKET-NNN` across `tickets/pending`, `tickets/in_progress`, `tickets/done`
   and add one. Never reuse a number.
2. Copy `tickets/_template.md` to `tickets/pending/TICKET-NNN-short-slug.md`.
3. Fill Goal, Context, and Plan. Context must let someone with only the repo pick this up: file
   paths, decision ids, related tickets, what was ruled out.
4. Set Created to today's date.

## start

1. Confirm `git status` is clean. If another ticket's work is uncommitted, close and commit it first.
2. Complete the Plan before moving the file: read every file the ticket will touch, list them in
   Context, make each step concrete, and name the verification command. No code changes until this
   is done.
3. Move the file from `pending/` to `in_progress/`. Set Status to `in-progress` and Started to today.
4. Write the first Handoff block before touching code, so a crash mid-ticket loses nothing.

## handoff

Whenever the ticket stays open at the end of a turn that touched code:

1. Tick finished plan items, append a dated Progress log entry.
2. Overwrite the Handoff section: State, Blocked on, Next, Read first. It must be true right now.
3. If blocked, set Status to `blocked` and say what it waits on. The file stays in `in_progress/`.

## close

1. Use `git status` and `git diff` as the evidence of what changed, not chat memory.
2. Fill Verification with the exact command run, in a code block, and its result. Run it now if it
   has not been run. Never claim a check passed if it did not.
3. Fill Outcome: what shipped, what was left out and why, follow-up tickets created (create them).
4. If a choice made here is expensive to reverse, record it with the `decide` skill and cite it.
5. Set Status to `done` and Completed to today. Move the file to `tickets/done/`.
6. Run `npm run verify`. A ticket is not closed until verify passes and the file has moved.
7. Commit, with `TICKET-NNN` in the subject and the moved ticket file included. The next ticket
   does not start until this commit exists.
