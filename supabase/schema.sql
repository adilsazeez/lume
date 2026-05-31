-- Lume schema for Supabase (Postgres)
-- Run in SQL Editor after creating a project, or via `supabase db push` locally.

-- Categories (names are unique)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#94a3b8',
  created_at timestamptz not null default now()
);

-- Threads (primary rows shown on timeline)
create table if not exists threads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category_id uuid references categories(id) on delete set null,
  color text not null default '#5c6f86',
  start_date date not null,
  due_date date not null,
  status text not null default 'active' check (status in ('not_started','active','paused','completed','archived')),
  canvas_placement text not null default 'active' check (canvas_placement in ('active','dormant')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint threads_due_on_or_after_start check (due_date >= start_date)
);

create index if not exists threads_category_id_idx on threads(category_id);
create index if not exists threads_status_idx on threads(status);
create index if not exists threads_canvas_placement_idx on threads(canvas_placement);

-- Optional per-day reflections for a thread
create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  log_date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_logs_one_per_day unique (thread_id, log_date)
);

create index if not exists daily_logs_thread_id_idx on daily_logs(thread_id);

-- “Work on today” selections (per thread + calendar day)
create table if not exists today_selections (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  selected_date date not null,
  is_selected boolean not null default true,
  constraint today_selections_unique unique (thread_id, selected_date)
);

create index if not exists today_selections_date_idx on today_selections(selected_date);

-- Mini-tasks: short-lived actions tied to a parent thread (side rail, not timeline)
create table if not exists mini_tasks (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  title text not null,
  note text,
  due_date date,
  status text not null default 'open' check (status in ('open','in_progress','done')),
  priority text check (priority in ('low','medium','high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists mini_tasks_thread_id_idx on mini_tasks(thread_id);
create index if not exists mini_tasks_status_idx on mini_tasks(status);
create index if not exists mini_tasks_due_date_idx on mini_tasks(due_date);

-- Maintain updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists threads_set_updated_at on threads;
create trigger threads_set_updated_at
before update on threads
for each row execute function public.set_updated_at();

drop trigger if exists daily_logs_set_updated_at on daily_logs;
create trigger daily_logs_set_updated_at
before update on daily_logs
for each row execute function public.set_updated_at();

drop trigger if exists mini_tasks_set_updated_at on mini_tasks;
create trigger mini_tasks_set_updated_at
before update on mini_tasks
for each row execute function public.set_updated_at();

-- Local single-user MVP: permissive anon access via RLS
alter table categories enable row level security;
alter table threads enable row level security;
alter table daily_logs enable row level security;
alter table today_selections enable row level security;
alter table mini_tasks enable row level security;

drop policy if exists categories_public_all on categories;
create policy categories_public_all
  on categories for all using (true) with check (true);

drop policy if exists threads_public_all on threads;
create policy threads_public_all
  on threads for all using (true) with check (true);

drop policy if exists daily_logs_public_all on daily_logs;
create policy daily_logs_public_all
  on daily_logs for all using (true) with check (true);

drop policy if exists today_selections_public_all on today_selections;
create policy today_selections_public_all
  on today_selections for all using (true) with check (true);

drop policy if exists mini_tasks_public_all on mini_tasks;
create policy mini_tasks_public_all
  on mini_tasks for all using (true) with check (true);

-- Local single-user focus day boundary (when focus threads reset)
create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
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

insert into user_settings (id, day_end_time)
values ('00000000-0000-4000-8000-000000000001', '03:00')
on conflict (id) do nothing;
