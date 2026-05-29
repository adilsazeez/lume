export type ThreadStatus = "not_started" | "active" | "paused" | "completed" | "archived";

export type CategoryRow = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

export type ThreadRow = {
  id: string;
  name: string;
  description: string;
  category_id: string | null;
  color: string;
  start_date: string;
  due_date: string;
  status: ThreadStatus;
  created_at: string;
  updated_at: string;
  category?: CategoryRow | null;
};

export type DailyLogRow = {
  id: string;
  thread_id: string;
  log_date: string;
  note: string;
  created_at: string;
  updated_at: string;
};

export type TodaySelectionRow = {
  id: string;
  thread_id: string;
  selected_date: string;
  is_selected: boolean;
};

export type MiniTaskStatus = "open" | "in_progress" | "done";

export type MiniTaskPriority = "low" | "medium" | "high";

export type MiniTaskRow = {
  id: string;
  thread_id: string;
  title: string;
  note: string | null;
  due_date: string | null;
  status: MiniTaskStatus;
  priority: MiniTaskPriority | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  thread?: Pick<ThreadRow, "id" | "name" | "color"> | null;
};

export type MiniTaskFilter = "all" | "today" | "upcoming" | "done";

export type DashboardPayload = {
  categories: CategoryRow[];
  timelineThreads: ThreadRow[];
  allThreads?: ThreadRow[];
  todaySelections: TodaySelectionRow[];
  todayLogs: DailyLogRow[];
  miniTasks: MiniTaskRow[];
  serverTodayISO: string;
  /** IANA timezone used for calendar-day boundaries (rollover polling). */
  dateTimezone: string;
};
