import { NextRequest, NextResponse } from 'next/server';
import { badRequest, parseId, parseTaskColumn } from '@/lib/api';
import { createTask, getProject, listTasks } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return badRequest('Invalid project id');
  return NextResponse.json(listTasks(id));
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const projectId = parseId(params.id);
  if (!projectId) return badRequest('Invalid project id');
  if (!getProject(projectId)) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return badRequest('Invalid JSON body');

  const title = String(body.title ?? '').trim();
  if (!title) return badRequest('title is required');

  const task = createTask({
    project_id: projectId,
    title,
    description: body.description === null ? undefined : body.description ? String(body.description) : undefined,
    assignee: body.assignee ? String(body.assignee) : undefined,
    column_name: parseTaskColumn(body.column_name),
    sort_order: typeof body.sort_order === 'number' ? body.sort_order : undefined,
  });

  return NextResponse.json(task, { status: 201 });
}
