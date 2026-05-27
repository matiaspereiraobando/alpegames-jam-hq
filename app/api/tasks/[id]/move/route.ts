import { NextRequest, NextResponse } from 'next/server';
import { badRequest, notFound, parseId, parseTaskColumn } from '@/lib/api';
import { moveTask } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const taskId = parseId(params.id);
  if (!taskId) return badRequest('Invalid task id');

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return badRequest('Invalid JSON body');

  const column = parseTaskColumn(body.column_name);
  if (!column) return badRequest('column_name is required and must be a valid column');

  const indexValue = body.to_index;
  const toIndex = typeof indexValue === 'number' ? indexValue : Number(indexValue);
  if (!Number.isFinite(toIndex) || toIndex < 0) {
    return badRequest('to_index must be a non-negative number');
  }

  const tasks = moveTask({ task_id: taskId, to_column: column, to_index: toIndex });
  if (!tasks) return notFound('Task not found');

  return NextResponse.json({ tasks });
}
