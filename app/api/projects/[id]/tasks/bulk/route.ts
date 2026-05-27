import { NextRequest, NextResponse } from 'next/server';
import { badRequest, parseId } from '@/lib/api';
import { bulkCreateTasks, getProject } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const projectId = parseId(params.id);
  if (!projectId) return badRequest('Invalid project id');
  if (!getProject(projectId)) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || !Array.isArray(body.tasks)) {
    return badRequest('Expected { tasks: [...] } payload');
  }

  const tasks = body.tasks
    .filter((item: unknown) => item && typeof item === 'object' && (item as { title?: unknown }).title)
    .map((item: { title: unknown; description?: unknown; column_name?: unknown; assignee?: unknown }) => ({
      title: String(item.title),
      description: item.description ? String(item.description) : undefined,
      column_name: item.column_name ? String(item.column_name) : undefined,
      assignee: item.assignee ? String(item.assignee) : undefined,
    }));

  const created = bulkCreateTasks(projectId, tasks);
  return NextResponse.json(created, { status: 201 });
}
