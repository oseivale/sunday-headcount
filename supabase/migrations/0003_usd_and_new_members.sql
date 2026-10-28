-- Sunday Headcount: USD offerings and new members per Sunday.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.
-- Existing Sundays get 0 for the new fields.

alter table public.services
  add column if not exists offering_1_usd numeric(10,2) not null default 0 check (offering_1_usd >= 0),
  add column if not exists offering_2_usd numeric(10,2) not null default 0 check (offering_2_usd >= 0),
  add column if not exists new_members integer not null default 0 check (new_members between 0 and 999);
