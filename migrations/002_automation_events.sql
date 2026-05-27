CREATE TABLE IF NOT EXISTS automation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'api'
    CHECK(source IN ('api', 'script', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
  payload TEXT NOT NULL,
  result TEXT,
  error TEXT,
  log_path TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  finished_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_pending
  ON automation_events(status, next_attempt_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_events_project
  ON automation_events(project_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_events_project_active
  ON automation_events(type, project_id)
  WHERE project_id IS NOT NULL AND status IN ('pending', 'running', 'success');

ALTER TABLE projects ADD COLUMN jam_number INTEGER;
ALTER TABLE projects ADD COLUMN jam_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_jam_number
  ON projects(jam_number) WHERE jam_number IS NOT NULL;
