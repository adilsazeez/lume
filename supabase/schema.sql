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
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint threads_due_on_or_after_start check (due_date >= start_date)
);

create index if not exists threads_category_id_idx on threads(category_id);
create index if not exists threads_status_idx on threads(status);

-- Subthreads nested under threads (no separate timeline span)
create table if not exists subthreads (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  name text not null,
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists subthreads_thread_id_idx on subthreads(thread_id);

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

-- Local single-user MVP: permissive anon access via RLS
alter table categories enable row level security;
alter table threads enable row level security;
alter table subthreads enable row level security;
alter table daily_logs enable row level security;
alter table today_selections enable row level security;

drop policy if exists categories_public_all on categories;
create policy categories_public_all
  on categories for all using (true) with check (true);

drop policy if exists threads_public_all on threads;
create policy threads_public_all
  on threads for all using (true) with check (true);

drop policy if exists subthreads_public_all on subthreads;
create policy subthreads_public_all
  on subthreads for all using (true) with check (true);

drop policy if exists daily_logs_public_all on daily_logs;
create policy daily_logs_public_all
  on daily_logs for all using (true) with check (true);

drop policy if exists today_selections_public_all on today_selections;
create policy today_selections_public_all
  on today_selections for all using (true) with check (true);
