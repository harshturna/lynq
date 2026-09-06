-- TICKET-076: dated notes pinned to a site, drawn as markers on its time charts.
-- Locked down like public.goals: read and written through postgres.js only.

create table public.notes (
  id          bigint generated always as identity primary key,
  site_id     bigint not null references public.websites(id) on delete cascade,
  -- the instant the note marks, chosen by the writer
  at          timestamptz not null default now(),
  text        text not null check (char_length(text) between 1 and 140),
  -- the owner's email, or key:<name> when written through an API key (D-017)
  author      text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index notes_site_at on public.notes (site_id, at);

alter table public.notes enable row level security;
revoke all on public.notes from anon, authenticated;
create policy "notes: owner all" on public.notes for all to authenticated
  using      (site_id in (select id from public.websites where user_id = auth.uid()))
  with check (site_id in (select id from public.websites where user_id = auth.uid()));
