-- Run in Supabase SQL editor if you already applied an older schema.sql without mini_tasks.

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

drop trigger if exists mini_tasks_set_updated_at on mini_tasks;
create trigger mini_tasks_set_updated_at
before update on mini_tasks
for each row execute function public.set_updated_at();

alter table mini_tasks enable row level security;

drop policy if exists mini_tasks_public_all on mini_tasks;
create policy mini_tasks_public_all
  on mini_tasks for all using (true) with check (true);
