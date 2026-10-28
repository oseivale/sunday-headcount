-- Sunday Headcount: people's names.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 60),
  last_name  text not null default '' check (char_length(last_name) <= 60),
  updated_at timestamptz not null default now()
);

-- Is the signed-in user in the same church as `other`?
create or replace function public.shares_church(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships a
    join public.memberships b on b.church_id = a.church_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- Is the signed-in user an admin of a church that `other` belongs to?
create or replace function public.is_admin_of(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships a
    join public.memberships b on b.church_id = a.church_id
    where a.user_id = auth.uid() and a.role = 'admin' and b.user_id = other
  );
$$;

alter table public.profiles enable row level security;

-- Everyone in a church can see each other's names; you edit your own; admins edit their team's.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select
  using (user_id = auth.uid() or public.shares_church(user_id));
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (user_id = auth.uid() or public.is_admin_of(user_id));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (user_id = auth.uid() or public.is_admin_of(user_id))
  with check (user_id = auth.uid() or public.is_admin_of(user_id));

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.audit_row();
