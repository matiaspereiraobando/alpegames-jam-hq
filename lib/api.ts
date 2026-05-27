import { NextResponse } from 'next/server';
import { ProjectStatus, TaskColumn } from './types';

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function parseId(value: string): number | null {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

const PROJECT_STATUSES = ['upcoming', 'active', 'completed', 'archived'] as const;
const TASK_COLUMNS = ['backlog', 'todo', 'in_progress', 'done'] as const;

export function parseProjectStatus(value: unknown): ProjectStatus | undefined {
  if (typeof value !== 'string') return undefined;
  return (PROJECT_STATUSES as readonly string[]).includes(value)
    ? (value as ProjectStatus)
    : undefined;
}

export function parseTaskColumn(value: unknown): TaskColumn | undefined {
  if (typeof value !== 'string') return undefined;
  return (TASK_COLUMNS as readonly string[]).includes(value) ? (value as TaskColumn) : undefined;
}
