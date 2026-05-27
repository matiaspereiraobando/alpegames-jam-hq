import { NextRequest, NextResponse } from 'next/server';
import { enqueueAutomationEvent } from '@/lib/automation/events.ts';
import { deriveJamFields } from '@/lib/automation/slug.ts';
import { badRequest, parseOptionalInt } from '@/lib/api';
import { createProjectWithDefaultTasks, listProjects } from '@/lib/db';

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

  const description = body.description === undefined ? undefined : body.description === null ? null : String(body.description);
  const engine = body.engine ? String(body.engine) : undefined;
  const jamFields = deriveJamFields({
    title,
    jam_number: parseOptionalInt(body.jam_number),
    jam_slug: body.jam_slug ? String(body.jam_slug) : undefined,
  });
  const source = request.headers.get('x-jamhq-automation-source') === 'script' ? 'script' : 'api';
  const skipAutomation = body.skip_automation === true;

  const project = createProjectWithDefaultTasks({
    title,
    description: description ?? undefined,
    engine,
    start_date: body.start_date ? String(body.start_date) : undefined,
    end_date: body.end_date ? String(body.end_date) : undefined,
    jam_number: jamFields.jam_number,
    jam_slug: jamFields.jam_slug,
  });

  let automation_event_id: number | null = null;

  if (!skipAutomation) {
    try {
      const event = enqueueAutomationEvent({
        type: 'project.created',
        project_id: project.id,
        source,
        payload: {
          title: project.title,
          description: project.description,
          engine: project.engine,
          jam_number: project.jam_number ?? jamFields.jam_number,
          jam_slug: project.jam_slug ?? jamFields.jam_slug,
          source,
        },
      });
      automation_event_id = event?.id ?? null;
    } catch (error) {
      console.error('Failed to enqueue automation event for project', project.id, error);
    }
  }

  return NextResponse.json({ ...project, automation_event_id }, { status: 201 });
}
