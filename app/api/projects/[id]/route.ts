import { NextRequest, NextResponse } from 'next/server';
import { badRequest, notFound, parseId, parseProjectStatus } from '@/lib/api';
import { getProject, updateProject } from '@/lib/db';

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

  const updated = updateProject(id, {
    title: body.title ? String(body.title) : undefined,
    description: body.description === null ? null : body.description ? String(body.description) : undefined,
    engine: body.engine ? String(body.engine) : undefined,
    status: body.status === null ? undefined : parseProjectStatus(body.status),
    start_date: body.start_date === null ? null : body.start_date ? String(body.start_date) : undefined,
    end_date: body.end_date === null ? null : body.end_date ? String(body.end_date) : undefined,
  });

  if (!updated) return notFound('Project not found');
  return NextResponse.json(updated);
}
