-- Sunday Headcount: special offering (with a short description), pledge and tithe, in CAD and USD.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.
-- Existing Sundays get 0 and no description.

alter table public.services
  add column if not exists offering_special      numeric(10,2) not null default 0 check (offering_special >= 0),
  add column if not exists offering_special_usd  numeric(10,2) not null default 0 check (offering_special_usd >= 0),
  add column if not exists offering_special_note text not null default '' check (char_length(offering_special_note) <= 80),
  add column if not exists pledge                numeric(10,2) not null default 0 check (pledge >= 0),
  add column if not exists pledge_usd            numeric(10,2) not null default 0 check (pledge_usd >= 0),
  add column if not exists tithe                 numeric(10,2) not null default 0 check (tithe >= 0),
  add column if not exists tithe_usd             numeric(10,2) not null default 0 check (tithe_usd >= 0);
