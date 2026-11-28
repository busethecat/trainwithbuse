-- Live Lab Classes memberships: who may join classes, and until when.
-- Run once in Supabase → SQL Editor, AFTER class_attendance.sql. Safe to run again.
--
-- Written only by the stripe-webhook Worker (service key) from Stripe events:
-- checkout.session.completed, customer.subscription.updated, customer.subscription.deleted.
-- Matched to members by email, so a membership counts even if the buyer creates
-- their account after paying.

create table if not exists public.class_memberships (
  id uuid primary key default gen_random_uuid(),
  stripe_ref text not null unique,          -- subscription id (sub_…), or checkout session id (cs_…) for a one-time payment
  stripe_customer_id text,
  email text not null,
  plan text check (plan in ('founding', 'standard', 'annual')),
  status text not null,                     -- Stripe subscription status, or 'paid' for a one-time payment
  current_period_start timestamptz,
  current_period_end timestamptz,           -- paid until
  cancel_at_period_end boolean not null default false,
  ended_at timestamptz,                     -- set by Stripe when the subscription has ended
  last_event_at timestamptz not null,       -- newest Stripe event applied (older ones are ignored)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists class_memberships_email_idx on public.class_memberships (lower(email));

alter table public.class_memberships enable row level security;

drop policy if exists "Members see their own memberships" on public.class_memberships;
create policy "Members see their own memberships" on public.class_memberships
  for select to authenticated using (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Admin manages memberships" on public.class_memberships;
create policy "Admin manages memberships" on public.class_memberships
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'hello@trainwithbuse.com')
  with check ((auth.jwt() ->> 'email') = 'hello@trainwithbuse.com');

-- Called by the Worker. Ignores events older than the last one applied, so a late
-- "updated" can't undo a "deleted". The email from checkout is kept (it is what matches
-- the member's account), even if the customer later changes their email in Stripe.
create or replace function public.upsert_class_membership(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.class_memberships as m (
    stripe_ref, stripe_customer_id, email, plan, status,
    current_period_start, current_period_end, cancel_at_period_end, ended_at, last_event_at)
  values (
    p ->> 'stripe_ref', p ->> 'stripe_customer_id', p ->> 'email', p ->> 'plan', p ->> 'status',
    (p ->> 'current_period_start')::timestamptz, (p ->> 'current_period_end')::timestamptz,
    coalesce((p ->> 'cancel_at_period_end')::boolean, false), (p ->> 'ended_at')::timestamptz,
    (p ->> 'event_at')::timestamptz)
  on conflict (stripe_ref) do update set
    stripe_customer_id = coalesce(excluded.stripe_customer_id, m.stripe_customer_id),
    email = coalesce(m.email, excluded.email),
    plan = coalesce(excluded.plan, m.plan),
    status = excluded.status,
    current_period_start = coalesce(excluded.current_period_start, m.current_period_start),
    current_period_end = coalesce(excluded.current_period_end, m.current_period_end),
    cancel_at_period_end = excluded.cancel_at_period_end,
    ended_at = excluded.ended_at,
    last_event_at = excluded.last_event_at,
    updated_at = now()
  where m.last_event_at <= excluded.last_event_at;
end $$;
revoke all on function public.upsert_class_membership(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_class_membership(jsonb) to service_role;

-- Exact, case-insensitive account lookup for the Worker (replaces the admin user list)
create or replace function public.user_id_for_email(p_email text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke all on function public.user_id_for_email(text) from public, anon, authenticated;
grant execute on function public.user_id_for_email(text) to service_role;

-- Who may join a class (replaces the "any purchase" version from class_attendance.sql):
--  - active / trialing subscription, or a one-time payment ('paid'), until the paid
--    period ends (+1 day so a renewal that is still being processed doesn't lock anyone out);
--    "cancel at period end" keeps access until then, an immediate cancellation ends it;
--  - past_due (a renewal payment failed, Stripe is retrying): 7 days' grace from the
--    start of the unpaid period;
--  - unpaid, canceled, incomplete, incomplete_expired, paused: no access;
--  - the admin account may always join, for testing.
create or replace function public.has_live_classes_access(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.class_memberships m
    join auth.users u on u.id = p_user and lower(u.email) = lower(m.email)
    where (m.status in ('active', 'trialing', 'paid') and m.current_period_end > now() - interval '1 day')
       or (m.status = 'past_due' and m.current_period_start > now() - interval '7 days')
  )
  or exists (select 1 from auth.users where id = p_user and email = 'hello@trainwithbuse.com');
$$;
revoke all on function public.has_live_classes_access(uuid) from public, anon, authenticated;

-- For the dashboard: does the signed-in member currently have class access?
create or replace function public.my_live_classes_access()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_live_classes_access(auth.uid());
$$;
revoke all on function public.my_live_classes_access() from public, anon;
grant execute on function public.my_live_classes_access() to authenticated;

-- Stripe retries events; one participants row per checkout. Skipped (with a notice)
-- if duplicate rows already exist — check them in the admin Participants tab.
do $$ begin
  create unique index if not exists participants_stripe_session_id_key on public.participants (stripe_session_id);
exception when unique_violation then
  raise notice 'participants has duplicate stripe_session_id rows; unique index not created';
end $$;
