import { NextRequest, NextResponse } from 'next/server';
import { listAutomationEvents } from '@/lib/automation/events.ts';
import { badRequest, parseId } from '@/lib/api';
import type { AutomationEventStatus } from '@/lib/types.ts';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: AutomationEventStatus[] = ['pending', 'running', 'success', 'failed', 'cancelled'];

export async function GET(request: NextRequest) {
  const projectIdParam = request.nextUrl.searchParams.get('project_id');
  const statusParam = request.nextUrl.searchParams.get('status');
  const limitParam = request.nextUrl.searchParams.get('limit');

  let project_id: number | undefined;
  if (projectIdParam !== null) {
    const parsed = parseId(projectIdParam);
    if (!parsed) {
      return badRequest('Invalid project_id');
    }
    project_id = parsed;
  }

  let status: AutomationEventStatus | undefined;
  if (statusParam !== null) {
    if (!VALID_STATUSES.includes(statusParam as AutomationEventStatus)) {
      return badRequest('Invalid status');
    }
    status = statusParam as AutomationEventStatus;
  }

  let limit: number | undefined;
  if (limitParam !== null) {
    const parsed = Number(limitParam);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return badRequest('Invalid limit');
    }
    limit = parsed;
  }

  return NextResponse.json(listAutomationEvents({ project_id, status, limit }));
}
