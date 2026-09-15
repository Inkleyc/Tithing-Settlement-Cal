create table if not exists app_settings (
  id boolean primary key default true check (id),
  ward_name varchar(150) not null default '',
  updated_at timestamptz not null default now()
);

insert into app_settings (id, ward_name) values (true, '') on conflict (id) do nothing;
alter table app_settings enable row level security;
