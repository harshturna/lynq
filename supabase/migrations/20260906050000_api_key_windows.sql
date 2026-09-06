-- TICKET-086: a per-key request counter that every server instance shares,
-- one row per key, reset when the minute changes. No retention needed: a key
-- has one row and it goes with the key.

create table if not exists analytics.api_key_windows (
  key_id       bigint primary key references analytics.api_keys(id) on delete cascade,
  window_start timestamptz not null,
  n            integer not null default 0
);
