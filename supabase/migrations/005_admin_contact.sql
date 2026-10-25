-- Adds contact settings only. Existing appointments, slots and settings are preserved.
alter table public.app_settings
  add column if not exists executive_secretary_name varchar(150) not null default '',
  add column if not exists executive_secretary_email varchar(255) not null default '';
