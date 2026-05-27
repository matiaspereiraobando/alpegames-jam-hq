import { NextRequest, NextResponse } from 'next/server';
import { badRequest, notFound, parseId, parseProjectStatus } from '@/lib/api';
import { deleteProject, getProject, updateProject } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return badRequest('Invalid project id');

  const project = getProject(id);
  if (!project) return notFound('Project not found');

  return NextResponse.json(project);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return badRequest('Invalid project id');

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return badRequest('Invalid JSON body');
  }

  const patch: Parameters<typeof updateProject>[1] = {};

  if ('title' in body) {
    const title = String(body.title ?? '').trim();
    if (!title) return badRequest('title cannot be empty');
    patch.title = title;
  }
  if ('description' in body) {
    patch.description = body.description === null ? null : String(body.description);
  }
  if ('engine' in body) {
    patch.engine = String(body.engine);
  }
  if ('status' in body) {
    const status = parseProjectStatus(body.status);
    if (!status) return badRequest('Invalid status');
    patch.status = status;
  }
  if ('start_date' in body) {
    patch.start_date = body.start_date === null ? null : String(body.start_date);
  }
  if ('end_date' in body) {
    patch.end_date = body.end_date === null ? null : String(body.end_date);
  }

  const updated = updateProject(id, patch);
  if (!updated) return notFound('Project not found');
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return badRequest('Invalid project id');

  const deleted = deleteProject(id);
  if (!deleted) return notFound('Project not found');

  return NextResponse.json({ ok: true });
}
