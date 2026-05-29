-- Allow not_started as a thread pace/status value
alter table threads drop constraint if exists threads_status_check;

alter table threads
  add constraint threads_status_check
  check (status in ('not_started', 'active', 'paused', 'completed', 'archived'));
