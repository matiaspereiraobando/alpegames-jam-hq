export type ProjectStatus = 'upcoming' | 'active' | 'completed' | 'archived';
export type TaskColumn = 'backlog' | 'todo' | 'in_progress' | 'done';

export interface Project {
  id: number;
  title: string;
  description: string | null;
  engine: string;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  column_name: TaskColumn;
  assignee: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
