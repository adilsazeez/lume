-- Drop unused day_start_time; focus boundary is day_end_time only

alter table user_settings drop column if exists day_start_time;
