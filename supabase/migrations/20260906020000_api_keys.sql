-- TICKET-085 / D-017: per-site API keys for callers that are not a browser.
-- Only the hash is stored; the token is shown once at creation.

create table if not exists analytics.api_keys (
  id          bigint generated always as identity primary key,
  site_id     bigint      not null references public.websites(id) on delete cascade,
  name        text        not null,
  -- 'ingest' writes events from a server, 'notes' writes annotations,
  -- 'read' reads analytics. Chosen at creation and never edited.
  scopes      text[]      not null check (
                scopes <@ array['ingest','notes','read']::text[]
                and array_length(scopes, 1) >= 1),
  token_hash  bytea       not null unique,
  -- the first characters of the token, so a key is identifiable in the list
  prefix      text        not null,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at  timestamptz
);

create index if not exists api_keys_site on analytics.api_keys (site_id);

-- Housekeeping drops keys of sites that are gone; the cascade above covers it.
