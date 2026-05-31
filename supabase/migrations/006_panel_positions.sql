-- Persist floating panel positions (mini-tasks, dormant dock) in user settings.

alter table user_settings
  add column if not exists panel_positions jsonb;

comment on column user_settings.panel_positions is
  'Floating panel layout, e.g. {"mini_tasks":{"x":12,"y":48},"dormant":{"x":400,"y":320}}';
