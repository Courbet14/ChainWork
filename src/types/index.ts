export type TaskStatus = '未着手' | '着手中' | '終了' | '停滞中';

export type TaskMetadata = {
  status?: TaskStatus;
  stuck_reason?: string;
  merged_task_ids?: string[];
  memo?: string;
  [key: string]: any;
};

export type Room = {
  id: string;
  name: string | null;
  is_copyable: boolean;
  edit_password?: string | null;
  memo?: string | null; // 💡 追加
  created_at: string;
};

export type TaskPage = {
  id: string;
  room_id: string;
  name: string;
  created_at: string;
};

export type FormField = {
  id: string;
  room_id: string;
  field_key: string;
  label: string;
  field_type: string;
  created_at: string;
};

export type Task = {
  id: string;
  room_id: string;
  page_id: string;
  prev_task_id: string | null;
  title: string;
  assignee: string | null;
  start_date: string | null;
  end_date: string | null;
  metadata: TaskMetadata;
  created_at: string;
};