-- "Reserve your spot" signups for Live Lab Classes (classes.html / -tr / -de).
-- Run once in Supabase → SQL Editor. Safe to run again.
-- Anyone may INSERT; only the admin account (hello@trainwithbuse.com) can read,
-- update or delete — that is what the admin "Class waitlist" tab uses.
create table if not exists public.class_waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320),
  interests text[] not null default '{}'
    check (interests <@ array['hiit', 'mobility', 'pilates', 'strength']::text[]),
  language text check (language in ('en', 'de', 'tr')),
  status text not null default 'new' check (status in ('new', 'contacted'))
);

alter table public.class_waitlist enable row level security;

drop policy if exists "Anyone can reserve a class spot" on public.class_waitlist;
create policy "Anyone can reserve a class spot"
  on public.class_waitlist for insert
  to anon, authenticated
  with check (status = 'new');

drop policy if exists "Admin manages the class waitlist" on public.class_waitlist;
create policy "Admin manages the class waitlist"
  on public.class_waitlist for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'hello@trainwithbuse.com')
  with check ((auth.jwt() ->> 'email') = 'hello@trainwithbuse.com');
