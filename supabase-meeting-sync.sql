-- Shared meeting availability and bookings.
-- Run this in the Supabase SQL Editor to enable shared meeting data.

create table if not exists public.daa_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.daa_meeting_settings (
  id integer primary key check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.daa_meeting_bookings (
  id text primary key,
  scheduled_date date not null,
  scheduled_time time not null,
  duration integer not null check (duration between 15 and 240),
  full_name text not null,
  email text not null,
  phone text not null default '',
  topic text not null,
  notes text not null default '',
  schedule_timezone text,
  local_date text,
  local_time text,
  visitor_timezone text,
  start_at timestamptz,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

insert into public.daa_meeting_settings (id, data)
values (
  1,
  '{
    "settings": {
      "slotDurationMinutes": 45,
      "bufferMinutes": 15,
      "minNoticeHours": 24,
      "maxAdvanceDays": 60,
      "timeZone": "Europe/Berlin",
      "meetingTitle": "1-on-1 German Consultation & Assessment",
      "meetingLocation": "Online via Google Meet (Link sent upon confirmation)"
    },
    "weeklySchedule": {
      "Monday": {"active": true, "start": "09:00", "end": "17:00"},
      "Tuesday": {"active": true, "start": "09:00", "end": "17:00"},
      "Wednesday": {"active": true, "start": "09:00", "end": "17:00"},
      "Thursday": {"active": true, "start": "09:00", "end": "17:00"},
      "Friday": {"active": true, "start": "09:00", "end": "15:00"},
      "Saturday": {"active": false, "start": "10:00", "end": "14:00"},
      "Sunday": {"active": false, "start": "10:00", "end": "14:00"}
    },
    "blockedDates": [
      {"date": "2026-10-31", "reason": "Reformation Day / Public Holiday"},
      {"date": "2026-11-01", "reason": "All Saints' Day"},
      {"date": "2026-12-24", "reason": "Christmas Eve"},
      {"date": "2026-12-25", "reason": "Christmas Day"}
    ],
    "blockedSlots": [
      {"date": "2026-10-12", "time": "14:00", "reason": "Teacher Briefing"},
      {"date": "2026-10-14", "time": "10:00", "reason": "Admin Maintenance"}
    ],
    "setupSeed": true
  }'::jsonb
)
on conflict (id) do nothing;

create unique index if not exists daa_meeting_bookings_confirmed_slot_unique
  on public.daa_meeting_bookings (scheduled_date, scheduled_time)
  where status = 'confirmed';

alter table public.daa_admin_users enable row level security;
alter table public.daa_meeting_settings enable row level security;
alter table public.daa_meeting_bookings enable row level security;

drop policy if exists "Admins can read their admin membership" on public.daa_admin_users;
create policy "Admins can read their admin membership"
  on public.daa_admin_users for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Anyone can read meeting availability" on public.daa_meeting_settings;
create policy "Anyone can read meeting availability"
  on public.daa_meeting_settings for select to anon, authenticated
  using (true);

create or replace function public.is_daa_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.daa_admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_daa_admin() from public;
grant execute on function public.is_daa_admin() to authenticated;

drop policy if exists "Admins can manage meeting availability" on public.daa_meeting_settings;
create policy "Admins can manage meeting availability"
  on public.daa_meeting_settings for all to authenticated
  using (public.is_daa_admin())
  with check (public.is_daa_admin());

drop policy if exists "Admins can read meeting bookings" on public.daa_meeting_bookings;
create policy "Admins can read meeting bookings"
  on public.daa_meeting_bookings for select to authenticated
  using (public.is_daa_admin());

drop policy if exists "Admins can update meeting bookings" on public.daa_meeting_bookings;
create policy "Admins can update meeting bookings"
  on public.daa_meeting_bookings for update to authenticated
  using (public.is_daa_admin())
  with check (public.is_daa_admin());

drop policy if exists "Admins can insert meeting bookings" on public.daa_meeting_bookings;
create policy "Admins can insert meeting bookings"
  on public.daa_meeting_bookings for insert to authenticated
  with check (public.is_daa_admin());

create or replace function public.get_daa_booked_slots(p_from date, p_to date)
returns table(id text, scheduled_date date, scheduled_time time, duration integer)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.scheduled_date, b.scheduled_time, b.duration
  from public.daa_meeting_bookings b
  where b.status = 'confirmed'
    and b.scheduled_date between p_from and p_to
    and p_to >= p_from
    and p_to <= p_from + 366;
$$;

revoke all on function public.get_daa_booked_slots(date, date) from public;
grant execute on function public.get_daa_booked_slots(date, date) to anon, authenticated;

create or replace function public.create_daa_booking(p_booking jsonb)
returns table(id text, scheduled_date date, scheduled_time time, duration integer, status text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_id text := p_booking->>'id';
  booking_date date := (p_booking->>'date')::date;
  booking_time time := (p_booking->>'time')::time;
  booking_duration integer := (p_booking->>'duration')::integer;
  booking_name text := trim(p_booking->>'full_name');
  booking_email text := trim(p_booking->>'email');
  booking_topic text := trim(p_booking->>'topic');
  availability jsonb;
  weekday_config jsonb;
  weekday_name text;
  opening_time time;
  closing_time time;
  configured_duration integer;
  configured_buffer integer;
  minimum_notice integer;
  maximum_advance integer;
begin
  if p_booking is null
    or booking_id is null or length(booking_id) < 1 or length(booking_id) > 100
    or booking_name is null or length(booking_name) < 1 or length(booking_name) > 120
    or booking_email is null or length(booking_email) < 3 or length(booking_email) > 254
    or booking_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or booking_topic is null or length(booking_topic) < 1 or length(booking_topic) > 120
    or booking_duration is null or booking_duration < 15 or booking_duration > 240
    or booking_date < current_date or booking_date > current_date + 366
    or length(coalesce(p_booking->>'phone', '')) > 40
    or length(coalesce(p_booking->>'notes', '')) > 2000
    or length(coalesce(p_booking->>'schedule_timezone', '')) > 100
    or length(coalesce(p_booking->>'visitor_timezone', '')) > 100
  then
    raise exception 'Invalid consultation booking details.';
  end if;

  select data into availability
  from public.daa_meeting_settings
  where id = 1;
  if availability is null then
    raise exception 'Meeting availability has not been configured.';
  end if;

  weekday_name := to_char(booking_date, 'FMDay');
  weekday_config := availability->'weeklySchedule'->weekday_name;
  if weekday_config is null
    or weekday_config->>'start' is null
    or weekday_config->>'end' is null
  then
    raise exception 'Meeting availability has not been configured for that day.';
  end if;
  opening_time := (weekday_config->>'start')::time;
  closing_time := (weekday_config->>'end')::time;
  configured_duration := coalesce((availability#>>'{settings,slotDurationMinutes}')::integer, 45);
  configured_buffer := coalesce((availability#>>'{settings,bufferMinutes}')::integer, 15);
  minimum_notice := coalesce((availability#>>'{settings,minNoticeHours}')::integer, 0);
  maximum_advance := coalesce((availability#>>'{settings,maxAdvanceDays}')::integer, 366);
  if configured_duration < 15 or configured_duration > 240
    or configured_buffer < 0 or configured_buffer > 240
  then
    raise exception 'Meeting availability has invalid slot settings.';
  end if;

  if weekday_config is null
    or coalesce((weekday_config->>'active')::boolean, false) = false
    or booking_duration <> configured_duration
    or booking_time < opening_time
    or booking_time + make_interval(mins => booking_duration) > closing_time
    or mod(
      (extract(epoch from (booking_time - opening_time)) / 60)::integer,
      configured_duration + configured_buffer
    ) <> 0
    or (booking_date + booking_time) at time zone coalesce(availability#>>'{settings,timeZone}', 'Europe/Berlin')
      < now() + make_interval(hours => minimum_notice)
    or (booking_date + booking_time) at time zone coalesce(availability#>>'{settings,timeZone}', 'Europe/Berlin')
      > now() + make_interval(days => maximum_advance)
    or (
      jsonb_typeof(availability->'blockedDates') = 'array'
      and exists (
        select 1 from jsonb_array_elements(availability->'blockedDates') as blocked(item)
        where item->>'date' = booking_date::text
      )
    )
    or (
      jsonb_typeof(availability->'blockedSlots') = 'array'
      and exists (
        select 1 from jsonb_array_elements(availability->'blockedSlots') as blocked(item)
        where item->>'date' = booking_date::text
          and (item->>'time')::time = booking_time
      )
    )
  then
    raise exception 'That consultation slot is not available.';
  end if;

  return query
  insert into public.daa_meeting_bookings (
    id, scheduled_date, scheduled_time, duration, full_name, email, phone, topic, notes,
    schedule_timezone, local_date, local_time, visitor_timezone, start_at
  ) values (
    booking_id, booking_date, booking_time, booking_duration, booking_name, booking_email,
    coalesce(p_booking->>'phone', ''), booking_topic, coalesce(p_booking->>'notes', ''),
    p_booking->>'schedule_timezone', p_booking->>'local_date', p_booking->>'local_time',
    p_booking->>'visitor_timezone', (p_booking->>'start_at')::timestamptz
  )
  returning daa_meeting_bookings.id, daa_meeting_bookings.scheduled_date,
    daa_meeting_bookings.scheduled_time, daa_meeting_bookings.duration,
    daa_meeting_bookings.status, daa_meeting_bookings.created_at;
end;
$$;

revoke all on function public.create_daa_booking(jsonb) from public;
grant execute on function public.create_daa_booking(jsonb) to anon, authenticated;

grant select on public.daa_admin_users, public.daa_meeting_settings to authenticated;
grant select on public.daa_meeting_settings to anon;
grant insert, update on public.daa_meeting_settings to authenticated;
grant select, insert, update on public.daa_meeting_bookings to authenticated;

-- Tell PostgREST to reload the schema cache immediately:
notify pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- QUICK ADMIN SETUP & TROUBLESHOOTING
-- Run any of these queries in your Supabase SQL Editor as needed:
-- -----------------------------------------------------------------------------

-- 1. If you did not receive a sign-up confirmation email, run this to
--    instantly verify all registered users without needing an email:
-- update auth.users
-- set email_confirmed_at = coalesce(email_confirmed_at, now())
-- where email_confirmed_at is null;

-- 2. Grant admin dashboard access to ALL existing registered users:
-- insert into public.daa_admin_users (user_id)
-- select id from auth.users
-- on conflict (user_id) do nothing;

-- 3. Or grant admin access to a specific user UUID:
-- insert into public.daa_admin_users (user_id)
-- values ('YOUR-AUTH-USER-UUID')
-- on conflict (user_id) do nothing;

-- 4. Reload the schema cache:
-- notify pgrst, 'reload schema';
