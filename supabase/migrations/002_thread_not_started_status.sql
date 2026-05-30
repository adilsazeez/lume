-- Allow not_started as a thread pace/status value.
-- Drops any existing status check on threads (constraint name varies by setup).
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'threads'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.threads drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.threads
  add constraint threads_status_check
  check (status in ('not_started', 'active', 'paused', 'completed', 'archived'));
