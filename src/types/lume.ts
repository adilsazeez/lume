export type ThreadStatus = "active" | "paused" | "completed" | "archived";

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
  subthreads?: SubthreadRow[];
};

export type SubthreadRow = {
  id: string;
  thread_id: string;
  name: string;
  done: boolean;
  sort_order: number;
  created_at: string;
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

export type DashboardPayload = {
  categories: CategoryRow[];
  timelineThreads: ThreadRow[];
  allThreads?: ThreadRow[];
  todaySelections: TodaySelectionRow[];
  todayLogs: DailyLogRow[];
  serverTodayISO: string;
};
