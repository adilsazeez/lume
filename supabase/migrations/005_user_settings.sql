-- Local single-user day boundary settings (Lume "day" can extend past midnight)

create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  day_start_time time not null default '00:00',
  day_end_time time not null default '03:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists user_settings_set_updated_at on user_settings;
create trigger user_settings_set_updated_at
before update on user_settings
for each row execute function public.set_updated_at();

alter table user_settings enable row level security;

drop policy if exists user_settings_public_all on user_settings;
create policy user_settings_public_all
  on user_settings for all using (true) with check (true);

-- Singleton row for local-only MVP
insert into user_settings (id, day_start_time, day_end_time)
values ('00000000-0000-4000-8000-000000000001', '00:00', '03:00')
on conflict (id) do nothing;
