import { NextRequest, NextResponse } from 'next/server';
import { badRequest, notFound, parseId, parseTaskColumn } from '@/lib/api';
import { deleteTask, updateTask } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const taskId = parseId(params.id);
  if (!taskId) return badRequest('Invalid task id');

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return badRequest('Invalid JSON body');

  const updated = updateTask(taskId, {
    title: body.title ? String(body.title) : undefined,
    description: body.description === null ? null : body.description ? String(body.description) : undefined,
    column_name: parseTaskColumn(body.column_name),
    assignee: body.assignee === null ? null : body.assignee ? String(body.assignee) : undefined,
    sort_order: typeof body.sort_order === 'number' ? body.sort_order : undefined,
  });

  if (!updated) return notFound('Task not found');
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const taskId = parseId(params.id);
  if (!taskId) return badRequest('Invalid task id');

  const deleted = deleteTask(taskId);
  if (!deleted) return notFound('Task not found');

  return NextResponse.json({ ok: true });
}
