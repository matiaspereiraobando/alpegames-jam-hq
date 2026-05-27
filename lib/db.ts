import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_TASK_TEMPLATES } from './constants';
import { Project, Task, TaskColumn } from './types';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'jam-hq.db');

function initDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      engine TEXT DEFAULT 'Love2D',
      status TEXT DEFAULT 'active' CHECK(status IN ('upcoming', 'active', 'completed', 'archived')),
      start_date TEXT,
      end_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      column_name TEXT DEFAULT 'backlog' CHECK(column_name IN ('backlog', 'todo', 'in_progress', 'done')),
      assignee TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_column_order
      ON tasks(project_id, column_name, sort_order);
    CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);
  `);

  return db;
}

const globalForDb = globalThis as unknown as { db?: Database.Database };
export const db = globalForDb.db ?? initDb();
if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}

export function listProjects(): Project[] {
  return db
    .prepare('SELECT * FROM projects ORDER BY datetime(created_at) DESC')
    .all() as Project[];
}

export function getProject(id: number): Project | undefined {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
}

export function createProject(input: {
  title: string;
  description?: string;
  engine?: string;
  status?: Project['status'];
  start_date?: string;
  end_date?: string;
}): Project {
  const stmt = db.prepare(
    `INSERT INTO projects (title, description, engine, status, start_date, end_date, created_at, updated_at)
     VALUES (@title, @description, @engine, @status, @start_date, @end_date, datetime('now'), datetime('now'))`
  );

  const result = stmt.run({
    title: input.title,
    description: input.description ?? null,
    engine: input.engine ?? 'Love2D',
    status: input.status ?? 'active',
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
  });

  return getProject(result.lastInsertRowid as number)!;
}

// Merge a partial patch into the current row, ignoring undefined keys so we don't
// accidentally clobber existing values when the caller didn't mean to update them.
// `null` is a legitimate value that DOES overwrite (used to clear optional fields).
function mergeDefined<T extends object>(current: T, patch: Partial<T>): T {
  const next: T = { ...current };
  for (const key of Object.keys(patch) as Array<keyof T>) {
    const value = patch[key];
    if (value !== undefined) {
      next[key] = value as T[typeof key];
    }
  }
  return next;
}

export function updateProject(id: number, patch: Partial<Project>): Project | undefined {
  const current = getProject(id);
  if (!current) return undefined;

  const next = mergeDefined(current, patch);

  db.prepare(
    `UPDATE projects
     SET title = @title,
         description = @description,
         engine = @engine,
         status = @status,
         start_date = @start_date,
         end_date = @end_date,
         updated_at = datetime('now')
     WHERE id = @id`
  ).run({
    id,
    title: next.title,
    description: next.description,
    engine: next.engine,
    status: next.status,
    start_date: next.start_date,
    end_date: next.end_date,
  });

  return getProject(id);
}

export function deleteProject(id: number): boolean {
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getTask(id: number): Task | undefined {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
}

export function listTasks(projectId: number): Task[] {
  return db
    .prepare(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY column_name ASC, sort_order ASC, id ASC'
    )
    .all(projectId) as Task[];
}

export function createTask(input: {
  project_id: number;
  title: string;
  description?: string | null;
  column_name?: TaskColumn;
  assignee?: string | null;
  sort_order?: number;
}): Task {
  const column = input.column_name ?? 'backlog';
  // Default sort_order to the end of the target column so new tasks land at the bottom
  // instead of all clumping at position 0.
  let sortOrder = input.sort_order;
  if (sortOrder === undefined) {
    const row = db
      .prepare(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM tasks WHERE project_id = ? AND column_name = ?'
      )
      .get(input.project_id, column) as { next: number };
    sortOrder = row.next;
  }

  const insert = db.prepare(
    `INSERT INTO tasks (project_id, title, description, column_name, assignee, sort_order, created_at, updated_at)
     VALUES (@project_id, @title, @description, @column_name, @assignee, @sort_order, datetime('now'), datetime('now'))`
  );

  const result = insert.run({
    project_id: input.project_id,
    title: input.title,
    description: input.description ?? null,
    column_name: column,
    assignee: input.assignee ?? null,
    sort_order: sortOrder,
  });

  return getTask(result.lastInsertRowid as number)!;
}

export function updateTask(id: number, patch: Partial<Task>): Task | undefined {
  const current = getTask(id);
  if (!current) return undefined;

  const next = mergeDefined(current, patch);
  // id must never change
  next.id = current.id;
  next.project_id = current.project_id;

  db.prepare(
    `UPDATE tasks
     SET title = @title,
         description = @description,
         column_name = @column_name,
         assignee = @assignee,
         sort_order = @sort_order,
         updated_at = datetime('now')
     WHERE id = @id`
  ).run({
    id,
    title: next.title,
    description: next.description,
    column_name: next.column_name,
    assignee: next.assignee,
    sort_order: next.sort_order,
  });

  return getTask(id);
}

export function deleteTask(id: number): boolean {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Atomically move a task to a new column/position and re-pack sort_order for
 * the affected columns so we don't drift into duplicate or sparse values.
 * Returns the fresh task list for the project.
 */
export function moveTask(input: {
  task_id: number;
  to_column: TaskColumn;
  to_index: number;
}): Task[] | undefined {
  const task = getTask(input.task_id);
  if (!task) return undefined;

  const projectId = task.project_id;
  const fromColumn = task.column_name;
  const toColumn = input.to_column;
  const toIndex = Math.max(0, Math.floor(input.to_index));

  const tx = db.transaction(() => {
    const fetchColumn = db.prepare(
      'SELECT id FROM tasks WHERE project_id = ? AND column_name = ? ORDER BY sort_order ASC, id ASC'
    );
    const updateOrder = db.prepare(
      "UPDATE tasks SET sort_order = ?, updated_at = datetime('now') WHERE id = ?"
    );
    const updateColumn = db.prepare(
      "UPDATE tasks SET column_name = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?"
    );

    if (fromColumn === toColumn) {
      const ids = (fetchColumn.all(projectId, toColumn) as Array<{ id: number }>).map((r) => r.id);
      const without = ids.filter((tid) => tid !== input.task_id);
      const clampedIndex = Math.min(toIndex, without.length);
      without.splice(clampedIndex, 0, input.task_id);
      without.forEach((tid, idx) => updateOrder.run(idx, tid));
    } else {
      const fromIds = (fetchColumn.all(projectId, fromColumn) as Array<{ id: number }>)
        .map((r) => r.id)
        .filter((tid) => tid !== input.task_id);
      fromIds.forEach((tid, idx) => updateOrder.run(idx, tid));

      const toIds = (fetchColumn.all(projectId, toColumn) as Array<{ id: number }>).map((r) => r.id);
      const clampedIndex = Math.min(toIndex, toIds.length);
      toIds.splice(clampedIndex, 0, input.task_id);
      toIds.forEach((tid, idx) => {
        if (tid === input.task_id) {
          updateColumn.run(toColumn, idx, tid);
        } else {
          updateOrder.run(idx, tid);
        }
      });
    }
  });

  tx();
  return listTasks(projectId);
}

export function bulkCreateTasks(
  projectId: number,
  tasks: Array<{ title: string; description?: string; column_name?: TaskColumn; assignee?: string }>
): Task[] {
  const create = db.prepare(
    `INSERT INTO tasks (project_id, title, description, column_name, assignee, sort_order, created_at, updated_at)
     VALUES (@project_id, @title, @description, @column_name, @assignee, @sort_order, datetime('now'), datetime('now'))`
  );

  // Track per-column next sort_order so multiple inserts into the same column
  // get sequential ordering instead of all sharing index 0.
  const tx = db.transaction((items: typeof tasks) => {
    const counters: Record<string, number> = {};
    for (const item of items) {
      const col = item.column_name ?? 'backlog';
      if (counters[col] === undefined) {
        const row = db
          .prepare(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM tasks WHERE project_id = ? AND column_name = ?'
          )
          .get(projectId, col) as { next: number };
        counters[col] = row.next;
      }
      create.run({
        project_id: projectId,
        title: item.title,
        description: item.description ?? null,
        column_name: col,
        assignee: item.assignee ?? null,
        sort_order: counters[col]++,
      });
    }
  });

  tx(tasks);
  return listTasks(projectId);
}

export function createProjectWithDefaultTasks(input: {
  title: string;
  description?: string;
  engine?: string;
  start_date?: string;
  end_date?: string;
}) {
  const project = createProject(input);
  bulkCreateTasks(
    project.id,
    DEFAULT_TASK_TEMPLATES.map((title, idx) => ({
      title,
      column_name: idx < 2 ? 'todo' : 'backlog',
    }))
  );
  return project;
}
