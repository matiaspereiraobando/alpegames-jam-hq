import { NextRequest, NextResponse } from 'next/server';
import { getAutomationEvent, retryAutomationEvent } from '@/lib/automation/events.ts';
import { badRequest, notFound, parseId, requireBearerToken } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireBearerToken(request, process.env.JAMHQ_ADMIN_TOKEN);
  if (authError) {
    return authError;
  }

  const id = parseId(params.id);
  if (!id) {
    return badRequest('Invalid automation event id');
  }

  const event = getAutomationEvent(id);
  if (!event) {
    return notFound('Automation event not found');
  }

  if (event.status !== 'failed') {
    return badRequest('Only failed automation events can be retried');
  }

  return NextResponse.json(retryAutomationEvent(id));
}
