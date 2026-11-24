-- Run once in Supabase → SQL Editor. Safe to re-run.

-- 1. Which language a Buse Method application was made in (en / de / tr), so
--    admin.html can email the applicant in that language. Until this runs,
--    applications still save (without it) and are emailed in English.
alter table public.inquiries
  add column if not exists language text
  check (language in ('en', 'de', 'tr'));

-- 2. Allow the new "waitlist" status. Removes any existing CHECK constraint on
--    inquiries.status (if there is one) and replaces it with one that includes it.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.inquiries'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.inquiries drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.inquiries
  add constraint inquiries_status_check
  check (status is null or status in ('new', 'accepted', 'waitlist', 'rejected'));
