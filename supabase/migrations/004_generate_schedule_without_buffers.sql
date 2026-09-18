create or replace function generate_schedule(p_date date,p_start_time time,p_end_time time,p_interval_minutes integer,p_buffer_every_minutes integer,p_notes text)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_day uuid; cursor_time time;
begin
  if p_date is null or p_end_time<=p_start_time or p_interval_minutes not between 5 and 60 then raise exception 'Invalid schedule settings.'; end if;
  insert into days(date,notes) values(p_date,left(coalesce(p_notes,''),255)) returning id into new_day;
  cursor_time:=p_start_time;
  while cursor_time<p_end_time loop
    insert into time_slots(day_id,start_time,end_time,is_buffer) values(new_day,cursor_time,least(cursor_time+(p_interval_minutes||' minutes')::interval,p_end_time),false);
    cursor_time:=cursor_time+(p_interval_minutes||' minutes')::interval;
  end loop;
  return new_day;
end $$;

revoke all on function generate_schedule(date,time,time,integer,integer,text) from public, anon, authenticated;
grant execute on function generate_schedule(date,time,time,integer,integer,text) to service_role;
