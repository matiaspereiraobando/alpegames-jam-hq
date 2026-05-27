export type ProjectStatus = 'upcoming' | 'active' | 'completed' | 'archived';
export type TaskColumn = 'backlog' | 'todo' | 'in_progress' | 'done';
export type AutomationEventStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
export type AutomationEventType = 'project.created';
export type AutomationEventSource = 'api' | 'script' | 'manual';

export interface AutomationEventPayload {
  title: string;
  description: string | null;
  engine: string;
  jam_number: number;
  jam_slug: string;
  source: AutomationEventSource;
  [key: string]: unknown;
}

export interface AutomationEventResult {
  repo_url?: string;
  local_path?: string;
  vps_path?: string;
  warning?: string;
  [key: string]: unknown;
}

export interface AutomationEvent {
  id: number;
  type: AutomationEventType;
  project_id: number | null;
  source: AutomationEventSource;
  status: AutomationEventStatus;
  payload: AutomationEventPayload;
  result: AutomationEventResult | null;
  error: string | null;
  log_path: string | null;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
}

export interface Project {
  id: number;
  title: string;
  description: string | null;
  engine: string;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  jam_number: number | null;
  jam_slug: string | null;
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
