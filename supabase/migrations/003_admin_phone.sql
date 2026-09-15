alter table app_settings
  add column if not exists executive_secretary_phone varchar(25) not null default '';
