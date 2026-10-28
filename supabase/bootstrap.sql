-- Run once, AFTER 0001_init.sql and AFTER you have invited yourself in
-- Supabase (Authentication > Users > Invite user) and signed in once.
-- It creates the church and makes you its first admin.
-- Replace YOUR_EMAIL below before running.

with c as (
  insert into public.churches (name, pastor_name, region, district, area)
  values ('Rehoboth Temple - Toronto', 'Bethmound Mensah', 'North America', 'District 1', 'Canada Area')
  returning id
)
insert into public.memberships (church_id, user_id, role)
select c.id, u.id, 'admin'
from c, auth.users u
where u.email = lower('valerie.osei@gmail.com');

-- Check it worked: this should return one row with role = admin.
select m.role, c.name, u.email
from public.memberships m
join public.churches c on c.id = m.church_id
join auth.users u on u.id = m.user_id;
