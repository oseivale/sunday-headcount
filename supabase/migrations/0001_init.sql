-- Sunday Headcount: first database migration.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.
--
-- Design notes
-- * Every table carries church_id, so one install could serve several assemblies later.
-- * report_submissions stores answers per (template_key, period_key). New report types for
--   other groups need a new template in code, not a new table.
-- * Row-level security (RLS) is on for every table. The app's buttons are not the only guard:
--   the database itself refuses what a role may not do.

create extension if not exists pgcrypto;

do $$ begin
  create type public.member_role as enum ('admin', 'pastor', 'usher', 'viewer');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- tables

create table if not exists public.churches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  pastor_name text,
  region      text,
  district    text,
  area        text,
  time_zone   text not null default 'America/Toronto',
  created_at  timestamptz not null default now()
);

create table if not exists public.memberships (
  church_id  uuid not null references public.churches(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.member_role not null default 'usher',
  created_at timestamptz not null default now(),
  primary key (church_id, user_id)
);
create index if not exists memberships_user_idx on public.memberships(user_id);

-- One row per service. kind leaves room for midweek or special services later.
create table if not exists public.services (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null references public.churches(id) on delete cascade,
  service_date date not null,
  kind         text not null default 'sunday',
  men          integer not null default 0 check (men between 0 and 9999),
  women        integer not null default 0 check (women between 0 and 9999),
  children     integer not null default 0 check (children between 0 and 9999),
  offering_1   numeric(10,2) not null default 0 check (offering_1 >= 0),
  offering_2   numeric(10,2) not null default 0 check (offering_2 >= 0),
  created_by   uuid references auth.users(id),
  updated_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (church_id, service_date, kind)
);
create index if not exists services_church_date_idx on public.services(church_id, service_date);

-- Monthly fiscal records that pre-fill Q27–31 and Q34 of the assembly form.
create table if not exists public.monthly_records (
  church_id  uuid not null references public.churches(id) on delete cascade,
  month      date not null check (extract(day from month) = 1),
  obligation text not null check (obligation in ('ssnit','tier2','tier3','paye','wht','mcf')),
  status     text not null check (status in ('paid','not_paid','na')),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (church_id, month, obligation)
);

-- Answers to any report template. template_key + period_key identify the report,
-- e.g. ('assembly-quarterly', '2026-Q3'). Other groups' reports use their own template_key.
create table if not exists public.report_submissions (
  id              uuid primary key default gen_random_uuid(),
  church_id       uuid not null references public.churches(id) on delete cascade,
  template_key    text not null,
  period_key      text not null,
  answers         jsonb not null default '{}'::jsonb,
  signed_initials text,
  signed_on       date,
  supervisor_name text,
  updated_by      uuid references auth.users(id),
  updated_at      timestamptz not null default now(),
  unique (church_id, template_key, period_key)
);

create table if not exists public.email_recipients (
  church_id  uuid not null references public.churches(id) on delete cascade,
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  created_at timestamptz not null default now(),
  primary key (church_id, email)
);

create table if not exists public.email_log (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid not null references public.churches(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  recipients text[] not null,
  subject    text not null,
  status     text not null check (status in ('sent','failed')),
  error      text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id         bigserial primary key,
  church_id  uuid,
  user_id    uuid,
  table_name text not null,
  action     text not null,
  old_row    jsonb,
  new_row    jsonb,
  at         timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers

create or replace function public.has_role(c uuid, roles public.member_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.church_id = c and m.user_id = auth.uid() and m.role = any(roles)
  );
$$;

create or replace function public.is_member(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.church_id = c and m.user_id = auth.uid());
$$;

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_log (church_id, user_id, table_name, action, old_row, new_row)
  values (
    (r->>'church_id')::uuid, auth.uid(), tg_table_name, tg_op,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists audit_services on public.services;
create trigger audit_services after insert or update or delete on public.services
  for each row execute function public.audit_row();
drop trigger if exists audit_monthly on public.monthly_records;
create trigger audit_monthly after insert or update or delete on public.monthly_records
  for each row execute function public.audit_row();
drop trigger if exists audit_reports on public.report_submissions;
create trigger audit_reports after insert or update or delete on public.report_submissions
  for each row execute function public.audit_row();
drop trigger if exists audit_memberships on public.memberships;
create trigger audit_memberships after insert or update or delete on public.memberships
  for each row execute function public.audit_row();
drop trigger if exists audit_recipients on public.email_recipients;
create trigger audit_recipients after insert or update or delete on public.email_recipients
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------- row-level security

alter table public.churches           enable row level security;
alter table public.memberships        enable row level security;
alter table public.services           enable row level security;
alter table public.monthly_records    enable row level security;
alter table public.report_submissions enable row level security;
alter table public.email_recipients   enable row level security;
alter table public.email_log          enable row level security;
alter table public.audit_log          enable row level security;

-- churches: members read; admins edit.
drop policy if exists churches_read on public.churches;
create policy churches_read on public.churches for select using (public.is_member(id));
drop policy if exists churches_update on public.churches;
create policy churches_update on public.churches for update
  using (public.has_role(id, array['admin']::public.member_role[]))
  with check (public.has_role(id, array['admin']::public.member_role[]));

-- memberships: you see your own row; admins see and manage all rows of their church.
drop policy if exists memberships_read on public.memberships;
create policy memberships_read on public.memberships for select
  using (user_id = auth.uid() or public.has_role(church_id, array['admin']::public.member_role[]));
drop policy if exists memberships_write on public.memberships;
create policy memberships_write on public.memberships for all
  using (public.has_role(church_id, array['admin']::public.member_role[]))
  with check (public.has_role(church_id, array['admin']::public.member_role[]));

-- services: every member reads; ushers, pastor and admins enter; only admins delete.
drop policy if exists services_read on public.services;
create policy services_read on public.services for select using (public.is_member(church_id));
drop policy if exists services_insert on public.services;
create policy services_insert on public.services for insert
  with check (public.has_role(church_id, array['admin','pastor','usher']::public.member_role[]));
drop policy if exists services_update on public.services;
create policy services_update on public.services for update
  using (public.has_role(church_id, array['admin','pastor','usher']::public.member_role[]))
  with check (public.has_role(church_id, array['admin','pastor','usher']::public.member_role[]));
drop policy if exists services_delete on public.services;
create policy services_delete on public.services for delete
  using (public.has_role(church_id, array['admin']::public.member_role[]));

-- monthly records and reports: pastor and admins only.
drop policy if exists monthly_all on public.monthly_records;
create policy monthly_all on public.monthly_records for all
  using (public.has_role(church_id, array['admin','pastor']::public.member_role[]))
  with check (public.has_role(church_id, array['admin','pastor']::public.member_role[]));
drop policy if exists reports_all on public.report_submissions;
create policy reports_all on public.report_submissions for all
  using (public.has_role(church_id, array['admin','pastor']::public.member_role[]))
  with check (public.has_role(church_id, array['admin','pastor']::public.member_role[]));

-- email list and logs: admins only. The server reads the list with the service key when sending.
drop policy if exists recipients_all on public.email_recipients;
create policy recipients_all on public.email_recipients for all
  using (public.has_role(church_id, array['admin']::public.member_role[]))
  with check (public.has_role(church_id, array['admin']::public.member_role[]));
drop policy if exists email_log_read on public.email_log;
create policy email_log_read on public.email_log for select
  using (public.has_role(church_id, array['admin']::public.member_role[]));
drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log for select
  using (public.has_role(church_id, array['admin']::public.member_role[]));
-- No insert/update/delete policies on email_log or audit_log: only the trigger and the server write them.
