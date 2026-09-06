# TICKET-069: The Lynq site moves from the guest account to the owner's

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ops

## Goal
The guest account's site list shows only Aivia; the site that tracks lynq.byharsh.com belongs to the owner's own account, with its events intact.

## Context
- Owner, 2026-09-06: "remove the lynq from the sites for the demo account", then "I created a
  new account via the email harshturna15@gmail.com, can we move it there?". Production had two
  live sites, both owned by guest@email.com (2604f6a9-…): Aivia (id 31, the seeded site) and
  Lynq (id 41, lynq.byharsh.com, 752 real events from the app tracking itself, design §11).
  The new account exists and is confirmed (7bbdd60a-…). The only column that ties a site to
  an account is public.websites.user_id; goals hang off the website row and
  analytics.identified_users.user_id is a tracked visitor's id, not an account.
- Deleting the site was the other option; rejected because it would drop the self-tracking
  data and leave the app's own snippet sending events the collector rejects.

## Plan
- [x] Production write, recorded here: `update public.websites set user_id = '7bbdd60a-…' where id = 41 and url = 'lynq.byharsh.com' and user_id = '2604f6a9-…'` (one row).
- [x] Read back the live sites and their owners.

## Progress log
- 2026-09-06 — Done.

## Handoff
Closed.

## Verification
```
select w.id, w.name, w.url, u.email from public.websites w join auth.users u on u.id = w.user_id where w.deleted_at is null
  31  Aivia  aivia.byharsh.com  guest@email.com
  41  Lynq   lynq.byharsh.com   harshturna15@gmail.com
npm run check:tickets   # pass
```

## Outcome
One row updated in production. Nothing left out; no follow-ups.
