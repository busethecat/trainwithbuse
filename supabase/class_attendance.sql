-- Live Lab Classes attendance (stage 1). Run once in Supabase → SQL Editor. Safe to run again.
--
-- How it works: the dashboard's "Join class" button is the only way into a class.
-- It calls join_class(session), which checks the membership and the join window
-- (10 min before → 15 min after the start), records attendance, and only then
-- returns the Zoom link. Zoom links live in class_zoom_rooms, which no member can read.
--
-- Ready for Zoom Pro participant reports later, without changing the dashboard:
--  - class_sessions.zoom_meeting_uuid  → the occurrence UUID a report is fetched for
--  - class_attendance.source / zoom_minutes / zoom_verified_at → filled from the report
--  - join_class only returns "a URL"; it can later return a personal registrant link
--    (so report rows match members exactly) instead of the shared room link.

-- 1. Weekly template (Berlin local time)
create table if not exists public.class_schedule (
  weekday smallint not null check (weekday between 1 and 7),   -- ISO: 1 = Monday
  start_time time not null,
  format text not null check (format in ('hiit', 'mobility', 'pilates', 'strength')),
  primary key (weekday, start_time)
);
insert into public.class_schedule (weekday, start_time, format) values
  (1, '18:00', 'hiit'),
  (1, '19:00', 'mobility'),
  (3, '07:00', 'pilates'),
  (3, '18:00', 'strength')
on conflict (weekday, start_time) do update set format = excluded.format;

-- 2. Individual classes
create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  duration_min smallint not null default 50,
  format text not null check (format in ('hiit', 'mobility', 'pilates', 'strength')),
  cancelled boolean not null default false,
  zoom_meeting_uuid text,                 -- filled later for Zoom participant reports
  unique (starts_at, format)
);

-- Creates the classes for a date range from the template. Berlin time, so the
-- 28 March 2027 clock change is handled. Existing classes are left as they are.
create or replace function public.generate_class_sessions(p_from date, p_to date)
returns integer language sql security definer set search_path = public as $$
  with inserted as (
    insert into public.class_sessions (starts_at, format)
    select (d::date + s.start_time) at time zone 'Europe/Berlin', s.format
    from generate_series(p_from, p_to, interval '1 day') d
    join public.class_schedule s on s.weekday = extract(isodow from d)
    on conflict (starts_at, format) do nothing
    returning 1
  )
  select count(*)::integer from inserted;
$$;
revoke all on function public.generate_class_sessions(date, date) from public, anon, authenticated;

select public.generate_class_sessions('2027-01-04', '2027-06-30');

-- 3. Zoom rooms (one recurring meeting per format). Never readable by members.
create table if not exists public.class_zoom_rooms (
  format text primary key check (format in ('hiit', 'mobility', 'pilates', 'strength')),
  join_url text not null check (join_url like 'https://%'),
  zoom_meeting_id text
);

-- 4. Attendance
create table if not exists public.class_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.class_sessions (id) on delete cascade,
  joined_at timestamptz not null default now(),
  source text not null default 'join_button' check (source in ('join_button', 'zoom_report', 'admin')),
  zoom_minutes smallint,                  -- from a Zoom participant report, later
  zoom_verified_at timestamptz,
  unique (user_id, session_id)
);

-- 5. Row Level Security
alter table public.class_schedule enable row level security;
alter table public.class_sessions enable row level security;
alter table public.class_zoom_rooms enable row level security;
alter table public.class_attendance enable row level security;

drop policy if exists "Members see the schedule" on public.class_schedule;
create policy "Members see the schedule" on public.class_schedule
  for select to authenticated using (true);

drop policy if exists "Members see class sessions" on public.class_sessions;
create policy "Members see class sessions" on public.class_sessions
  for select to authenticated using (true);

drop policy if exists "Members see their own attendance" on public.class_attendance;
create policy "Members see their own attendance" on public.class_attendance
  for select to authenticated using (user_id = auth.uid());

-- Admin (hello@trainwithbuse.com) manages everything; members can never write directly.
drop policy if exists "Admin manages class sessions" on public.class_sessions;
create policy "Admin manages class sessions" on public.class_sessions
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'hello@trainwithbuse.com')
  with check ((auth.jwt() ->> 'email') = 'hello@trainwithbuse.com');

drop policy if exists "Admin manages zoom rooms" on public.class_zoom_rooms;
create policy "Admin manages zoom rooms" on public.class_zoom_rooms
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'hello@trainwithbuse.com')
  with check ((auth.jwt() ->> 'email') = 'hello@trainwithbuse.com');

drop policy if exists "Admin manages attendance" on public.class_attendance;
create policy "Admin manages attendance" on public.class_attendance
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'hello@trainwithbuse.com')
  with check ((auth.jwt() ->> 'email') = 'hello@trainwithbuse.com');

-- 6. Who may join. One place to change when subscription status is tracked
-- (today: any live-lab-classes purchase; the admin account may always join, for testing).
create or replace function public.has_live_classes_access(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.purchases where user_id::text = p_user::text and course_id = 'live-lab-classes')
      or exists (select 1 from auth.users where id = p_user and email = 'hello@trainwithbuse.com');
$$;
revoke all on function public.has_live_classes_access(uuid) from public, anon, authenticated;

-- 7. The Join button. Returns the Zoom link, or raises one of:
--    not_signed_in, no_membership, no_such_class, class_cancelled, not_open_yet,
--    join_closed, no_zoom_link
create or replace function public.join_class(p_session_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  s public.class_sessions;
  url text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.has_live_classes_access(auth.uid()) then raise exception 'no_membership'; end if;

  select * into s from public.class_sessions where id = p_session_id;
  if not found then raise exception 'no_such_class'; end if;
  if s.cancelled then raise exception 'class_cancelled'; end if;
  if now() < s.starts_at - interval '10 minutes' then raise exception 'not_open_yet'; end if;
  if now() > s.starts_at + interval '15 minutes' then raise exception 'join_closed'; end if;

  select join_url into url from public.class_zoom_rooms where format = s.format;
  if url is null then raise exception 'no_zoom_link'; end if;

  insert into public.class_attendance (user_id, session_id)
  values (auth.uid(), s.id)
  on conflict (user_id, session_id) do nothing;   -- re-joining after a dropout is fine

  return url;
end $$;
revoke all on function public.join_class(uuid) from public, anon;
grant execute on function public.join_class(uuid) to authenticated;
