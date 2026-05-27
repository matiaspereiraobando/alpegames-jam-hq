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
  db.pragma('foreign_keys = ON');

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

export function updateProject(id: number, patch: Partial<Project>): Project | undefined {
  const current = getProject(id);
  if (!current) return undefined;

  const next = {
    ...current,
    ...patch,
  };

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
  description?: string;
  column_name?: TaskColumn;
  assignee?: string;
  sort_order?: number;
}): Task {
  const insert = db.prepare(
    `INSERT INTO tasks (project_id, title, description, column_name, assignee, sort_order, created_at, updated_at)
     VALUES (@project_id, @title, @description, @column_name, @assignee, @sort_order, datetime('now'), datetime('now'))`
  );

  const result = insert.run({
    project_id: input.project_id,
    title: input.title,
    description: input.description ?? null,
    column_name: input.column_name ?? 'backlog',
    assignee: input.assignee ?? null,
    sort_order: input.sort_order ?? 0,
  });

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid) as Task;
}

export function updateTask(id: number, patch: Partial<Task>): Task | undefined {
  const current = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
  if (!current) return undefined;

  const next: Task = { ...current, ...patch, id: current.id };

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

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
}

export function deleteTask(id: number): boolean {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function bulkCreateTasks(
  projectId: number,
  tasks: Array<{ title: string; description?: string; column_name?: TaskColumn; assignee?: string }>
): Task[] {
  const create = db.prepare(
    `INSERT INTO tasks (project_id, title, description, column_name, assignee, sort_order, created_at, updated_at)
     VALUES (@project_id, @title, @description, @column_name, @assignee, @sort_order, datetime('now'), datetime('now'))`
  );

  const tx = db.transaction((items: typeof tasks) => {
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      create.run({
        project_id: projectId,
        title: item.title,
        description: item.description ?? null,
        column_name: item.column_name ?? 'backlog',
        assignee: item.assignee ?? null,
        sort_order: i,
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
