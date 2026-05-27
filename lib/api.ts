import { NextRequest, NextResponse } from 'next/server';
import type { ProjectStatus, TaskColumn } from './types.ts';

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

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function parseOptionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed)) return undefined;
  return parsed;
}

export function requireBearerToken(request: NextRequest, expectedToken?: string | null) {
  if (!expectedToken) {
    return forbidden('JAMHQ_ADMIN_TOKEN is not configured');
  }

  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (token !== expectedToken) {
    return unauthorized();
  }

  return null;
}
