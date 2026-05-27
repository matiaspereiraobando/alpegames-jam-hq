import { NextRequest, NextResponse } from 'next/server';
import { createProjectWithDefaultTasks, listProjects } from '@/lib/db';
import { badRequest } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(listProjects());
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return badRequest('Invalid JSON body');
  }

  const title = String(body.title ?? '').trim();
  if (!title) {
    return badRequest('title is required');
  }

  const project = createProjectWithDefaultTasks({
    title,
    description: body.description ? String(body.description) : undefined,
    engine: body.engine ? String(body.engine) : undefined,
    start_date: body.start_date ? String(body.start_date) : undefined,
    end_date: body.end_date ? String(body.end_date) : undefined,
  });

  return NextResponse.json(project, { status: 201 });
}
