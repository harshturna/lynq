---
name: decide
description: Record a consequential product or architecture decision in tickets/DECISIONS.md after an expensive-to-reverse choice is made.
argument-hint: "[short title]"
allowed-tools: Read Edit Bash(date *)
---

## Trigger

Only when a choice is expensive to reverse or its reasoning would be confusing to rediscover:
storage engine, identity model, external service, schema shape, scope cut. Routine implementation
choices belong in the ticket's progress log.

## Steps

1. Read `tickets/DECISIONS.md` and choose the next `D-NNN` id.
2. Append an entry using the format defined at the top of that file. Fill every field.
3. State the rejected alternatives fairly and give both positive and negative consequences.
4. If superseding an earlier decision, change only its Status to `Superseded by D-NNN`.
5. Cite the new id from the ticket that made the decision.
