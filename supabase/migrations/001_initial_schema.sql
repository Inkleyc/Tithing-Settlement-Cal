create extension if not exists pgcrypto;
create table days (id uuid primary key default gen_random_uuid(), date date not null unique, is_active boolean not null default true, notes varchar(255));
create table time_slots (id uuid primary key default gen_random_uuid(), day_id uuid not null references days(id) on delete cascade, start_time time not null, end_time time not null, is_buffer boolean not null default false, is_blocked boolean not null default false, created_at timestamptz not null default now(), unique(day_id,start_time));
create table appointments (id uuid primary key default gen_random_uuid(), time_slot_id uuid not null references time_slots(id), paired_slot_id uuid references time_slots(id), member_name varchar(150) not null, email varchar(255) not null, phone varchar(25) not null, is_large_family boolean not null default false, reschedule_token uuid not null unique default gen_random_uuid(), status varchar(20) not null default 'confirmed' check(status in ('confirmed','cancelled')), reminder_email_sent boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index appointments_confirmed_primary on appointments(time_slot_id) where status = 'confirmed';
create unique index appointments_confirmed_paired on appointments(paired_slot_id) where status = 'confirmed' and paired_slot_id is not null;
create unique index appointments_confirmed_all_slots on appointments((least(time_slot_id, paired_slot_id)), (greatest(time_slot_id, paired_slot_id))) where status = 'confirmed' and paired_slot_id is not null;
alter table days enable row level security;
alter table time_slots enable row level security;
alter table appointments enable row level security;

create or replace function book_appointment(p_day_id uuid, p_slot_id uuid, p_member_name text, p_email text, p_phone text, p_is_large_family boolean)
returns appointments language plpgsql security definer set search_path = public as $$
declare chosen time_slots; following time_slots; created appointments;
begin
  if length(trim(p_member_name)) not between 1 and 150 or length(trim(p_email)) not between 3 and 255 or length(trim(p_phone)) not between 7 and 25 then raise exception 'Invalid appointment details.'; end if;
  select s.* into chosen from time_slots s join days d on d.id=s.day_id where s.id=p_slot_id and d.is_active and (p_day_id is null or d.id=p_day_id) for update of s;
  if not found then raise exception 'That date or time slot is not active.'; end if;
  if chosen.is_buffer or chosen.is_blocked then raise exception 'This time slot is unavailable.'; end if;
  if exists(select 1 from appointments a where a.status='confirmed' and (a.time_slot_id=chosen.id or a.paired_slot_id=chosen.id)) then raise exception 'This slot is already reserved.'; end if;
  if p_is_large_family then
    select * into following from time_slots where day_id=chosen.day_id and start_time=chosen.end_time for update;
    if not found or following.is_buffer or following.is_blocked or exists(select 1 from appointments a where a.status='confirmed' and (a.time_slot_id=following.id or a.paired_slot_id=following.id)) then raise exception 'The following slot is not open for a double block reservation.'; end if;
  end if;
  insert into appointments(time_slot_id,paired_slot_id,member_name,email,phone,is_large_family) values(chosen.id,case when p_is_large_family then following.id end,trim(p_member_name),lower(trim(p_email)),trim(p_phone),p_is_large_family) returning * into created;
  return created;
end $$;

create or replace function reschedule_appointment(p_token uuid, p_new_slot_id uuid)
returns appointments language plpgsql security definer set search_path = public as $$
declare current appointments; chosen time_slots; following time_slots;
begin
  select * into current from appointments where reschedule_token=p_token and status='confirmed' for update;
  if not found then raise exception 'That reschedule link is no longer valid.'; end if;
  select s.* into chosen from time_slots s join days d on d.id=s.day_id where s.id=p_new_slot_id and d.is_active for update of s;
  if not found or chosen.is_buffer or chosen.is_blocked then raise exception 'The selected time is unavailable.'; end if;
  if exists(select 1 from appointments a where a.status='confirmed' and a.id<>current.id and (a.time_slot_id=chosen.id or a.paired_slot_id=chosen.id)) then raise exception 'The selected time is already reserved.'; end if;
  if current.is_large_family then select * into following from time_slots where day_id=chosen.day_id and start_time=chosen.end_time for update; if not found or following.is_buffer or following.is_blocked or exists(select 1 from appointments a where a.status='confirmed' and a.id<>current.id and (a.time_slot_id=following.id or a.paired_slot_id=following.id)) then raise exception 'A 20-minute double block is not available at that time.'; end if; end if;
  update appointments set time_slot_id=chosen.id,paired_slot_id=case when current.is_large_family then following.id end,updated_at=now() where id=current.id returning * into current;
  return current;
end $$;

create or replace function generate_schedule(p_date date,p_start_time time,p_end_time time,p_interval_minutes integer,p_buffer_every_minutes integer,p_notes text)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_day uuid; cursor_time time; offset_minutes integer:=0;
begin
  if p_date is null or p_end_time<=p_start_time or p_interval_minutes not between 5 and 60 or p_buffer_every_minutes<p_interval_minutes or p_buffer_every_minutes>180 then raise exception 'Invalid schedule settings.'; end if;
  insert into days(date,notes) values(p_date,left(coalesce(p_notes,''),255)) returning id into new_day;
  cursor_time:=p_start_time;
  while cursor_time<p_end_time loop insert into time_slots(day_id,start_time,end_time,is_buffer) values(new_day,cursor_time,least(cursor_time+(p_interval_minutes||' minutes')::interval,p_end_time),(offset_minutes>0 and mod(offset_minutes,p_buffer_every_minutes)=0)); cursor_time:=cursor_time+(p_interval_minutes||' minutes')::interval;offset_minutes:=offset_minutes+p_interval_minutes;end loop;
  return new_day;
end $$;

revoke all on function book_appointment(uuid,uuid,text,text,text,boolean) from public, anon, authenticated;
revoke all on function reschedule_appointment(uuid,uuid) from public, anon, authenticated;
revoke all on function generate_schedule(date,time,time,integer,integer,text) from public, anon, authenticated;
grant execute on function book_appointment(uuid,uuid,text,text,text,boolean) to service_role;
grant execute on function reschedule_appointment(uuid,uuid) to service_role;
grant execute on function generate_schedule(date,time,time,integer,integer,text) to service_role;
