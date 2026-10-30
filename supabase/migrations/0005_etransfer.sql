-- Sunday Headcount: e-transfer offerings (CAD), entered by the pastor or an admin.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.
-- Existing Sundays get 0.

alter table public.services
  add column if not exists etransfer numeric(10,2) not null default 0 check (etransfer >= 0);

-- Only admins and the pastor may set or change the e-transfer amount.
-- Anyone else (ushers) can still save the Sunday: their save keeps the amount already there
-- (or 0 for a new Sunday), so a headcount correction never wipes the pastor's e-transfer total.
-- Writes without a signed-in user (the SQL Editor, the server's service key) are not restricted.
create or replace function public.protect_etransfer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.has_role(new.church_id, array['admin','pastor']::public.member_role[]) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.etransfer := 0;
  else
    new.etransfer := old.etransfer;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_etransfer on public.services;
create trigger protect_etransfer before insert or update on public.services
  for each row execute function public.protect_etransfer();
