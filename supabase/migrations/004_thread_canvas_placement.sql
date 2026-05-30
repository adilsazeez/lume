-- Canvas vs dormant dock placement
alter table threads
  add column if not exists canvas_placement text not null default 'active'
  check (canvas_placement in ('active', 'dormant'));

-- Not-started threads belong in the dock by default
update threads
set canvas_placement = 'dormant'
where status = 'not_started';

create index if not exists threads_canvas_placement_idx on threads(canvas_placement);
