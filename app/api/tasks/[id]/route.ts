import { NextRequest, NextResponse } from 'next/server';
import { badRequest, notFound, parseId, parseTaskColumn } from '@/lib/api';
import { deleteTask, updateTask } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const taskId = parseId(params.id);
  if (!taskId) return badRequest('Invalid task id');

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return badRequest('Invalid JSON body');

  // Build a patch that only contains keys the caller actually sent — that way the
  // DB layer can `mergeDefined` and preserve unrelated fields. `null` is allowed
  // for nullable fields to explicitly clear them.
  const patch: Parameters<typeof updateTask>[1] = {};

  if ('title' in body) {
    const title = body.title === null ? '' : String(body.title ?? '').trim();
    if (!title) return badRequest('title cannot be empty');
    patch.title = title;
  }
  if ('description' in body) {
    patch.description = body.description === null ? null : String(body.description);
  }
  if ('assignee' in body) {
    patch.assignee = body.assignee === null ? null : String(body.assignee);
  }
  if ('column_name' in body) {
    const col = parseTaskColumn(body.column_name);
    if (!col) return badRequest('Invalid column_name');
    patch.column_name = col;
  }
  if ('sort_order' in body) {
    if (typeof body.sort_order !== 'number' || !Number.isFinite(body.sort_order)) {
      return badRequest('sort_order must be a number');
    }
    patch.sort_order = body.sort_order;
  }

  const updated = updateTask(taskId, patch);
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
