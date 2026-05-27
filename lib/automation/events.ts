import { db } from '../db.ts';
import type {
  AutomationEvent,
  AutomationEventPayload,
  AutomationEventResult,
  AutomationEventSource,
  AutomationEventStatus,
  AutomationEventType,
} from '../types.ts';

export interface EnqueueAutomationEventInput {
  type: AutomationEventType;
  project_id: number | null;
  source: AutomationEventSource;
  payload: AutomationEventPayload;
  max_attempts?: number;
}

export interface ListAutomationEventsOptions {
  project_id?: number;
  status?: AutomationEventStatus;
  limit?: number;
}

const TERMINAL_RETRY_DELAYS_MS = [30_000, 120_000, 600_000];

type AutomationEventRow = Omit<AutomationEvent, 'payload' | 'result'> & {
  payload: string;
  result: string | null;
};

export function enqueueAutomationEvent(input: EnqueueAutomationEventInput): AutomationEvent | null {
  try {
    const result = db
      .prepare(
        `INSERT INTO automation_events (
          type,
          project_id,
          source,
          status,
          payload,
          max_attempts,
          next_attempt_at,
          created_at,
          updated_at
        ) VALUES (
          @type,
          @project_id,
          @source,
          'pending',
          @payload,
          @max_attempts,
          datetime('now'),
          datetime('now'),
          datetime('now')
        )`
      )
      .run({
        type: input.type,
        project_id: input.project_id,
        source: input.source,
        payload: JSON.stringify(input.payload),
        max_attempts: input.max_attempts ?? 3,
      });

    return getAutomationEvent(result.lastInsertRowid as number) ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed')) {
      return getActiveEventForProject(input.type, input.project_id);
    }

    throw error;
  }
}

export function getAutomationEvent(id: number): AutomationEvent | undefined {
  const row = db.prepare('SELECT * FROM automation_events WHERE id = ?').get(id) as
    | AutomationEventRow
    | undefined;

  return row ? parseAutomationEvent(row) : undefined;
}

export function listAutomationEvents(options: ListAutomationEventsOptions = {}): AutomationEvent[] {
  const clauses: string[] = [];
  const params: Array<number | string> = [];

  if (options.project_id !== undefined) {
    clauses.push('project_id = ?');
    params.push(options.project_id);
  }

  if (options.status) {
    clauses.push('status = ?');
    params.push(options.status);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.max(1, Math.min(options.limit ?? 50, 200));
  const rows = db
    .prepare(
      `SELECT * FROM automation_events ${whereClause} ORDER BY datetime(created_at) DESC, id DESC LIMIT ?`
    )
    .all(...params, limit) as AutomationEventRow[];

  return rows.map(parseAutomationEvent);
}

export function claimNextPendingEvent(): AutomationEvent | null {
  const tx = db.transaction(() => {
    const row = db
      .prepare(
        `SELECT * FROM automation_events
         WHERE status = 'pending'
           AND source != 'script'
           AND (next_attempt_at IS NULL OR datetime(next_attempt_at) <= datetime('now'))
         ORDER BY datetime(created_at) ASC, id ASC
         LIMIT 1`
      )
      .get() as AutomationEventRow | undefined;

    if (!row) {
      return null;
    }

    const update = db
      .prepare(
        `UPDATE automation_events
         SET status = 'running',
             started_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ? AND status = 'pending'`
      )
      .run(row.id);

    if (update.changes === 0) {
      return null;
    }

    return getAutomationEvent(row.id) ?? null;
  });

  return tx();
}

export function markAutomationEventRunning(id: number): AutomationEvent | undefined {
  db.prepare(
    `UPDATE automation_events
     SET status = 'running',
         started_at = COALESCE(started_at, datetime('now')),
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(id);

  return getAutomationEvent(id);
}

export function markAutomationEventSuccess(input: {
  id: number;
  result?: AutomationEventResult | null;
  log_path?: string | null;
}): AutomationEvent | undefined {
  db.prepare(
    `UPDATE automation_events
     SET status = 'success',
         result = @result,
         error = NULL,
         log_path = COALESCE(@log_path, log_path),
         finished_at = datetime('now'),
         updated_at = datetime('now')
     WHERE id = @id`
  ).run({
    id: input.id,
    result: input.result ? JSON.stringify(input.result) : null,
    log_path: input.log_path ?? null,
  });

  return getAutomationEvent(input.id);
}

export function markAutomationEventFailure(input: {
  id: number;
  error: string;
  log_path?: string | null;
}): AutomationEvent | undefined {
  const event = getAutomationEvent(input.id);
  if (!event) {
    return undefined;
  }

  const nextAttempts = event.attempts + 1;
  const shouldRetry = nextAttempts < event.max_attempts;
  const nextAttemptAt = shouldRetry
    ? new Date(Date.now() + retryDelayMs(nextAttempts - 1)).toISOString()
    : null;

  db.prepare(
    `UPDATE automation_events
     SET status = @status,
         attempts = @attempts,
         error = @error,
         log_path = COALESCE(@log_path, log_path),
         next_attempt_at = @next_attempt_at,
         started_at = CASE WHEN @status = 'pending' THEN NULL ELSE started_at END,
         finished_at = CASE WHEN @status = 'failed' THEN datetime('now') ELSE NULL END,
         updated_at = datetime('now')
     WHERE id = @id`
  ).run({
    id: input.id,
    status: shouldRetry ? 'pending' : 'failed',
    attempts: nextAttempts,
    error: input.error,
    log_path: input.log_path ?? null,
    next_attempt_at: nextAttemptAt,
  });

  return getAutomationEvent(input.id);
}

export function retryAutomationEvent(id: number): AutomationEvent | undefined {
  db.prepare(
    `UPDATE automation_events
     SET status = 'pending',
         attempts = 0,
         error = NULL,
         started_at = NULL,
         finished_at = NULL,
         next_attempt_at = datetime('now'),
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(id);

  return getAutomationEvent(id);
}

export function resetStaleRunningEvents(staleBeforeIso: string): number {
  const result = db.prepare(
    `UPDATE automation_events
     SET status = CASE WHEN attempts + 1 >= max_attempts THEN 'failed' ELSE 'pending' END,
         attempts = attempts + 1,
         error = COALESCE(error, 'Worker crash recovery re-queued stale running event'),
         next_attempt_at = datetime('now'),
         started_at = NULL,
         finished_at = CASE WHEN attempts + 1 >= max_attempts THEN datetime('now') ELSE NULL END,
         updated_at = datetime('now')
     WHERE status = 'running' AND datetime(started_at) <= datetime(?)`
  ).run(staleBeforeIso);

  return result.changes;
}

function getActiveEventForProject(
  type: AutomationEventType,
  projectId: number | null
): AutomationEvent | null {
  if (projectId == null) {
    return null;
  }

  const row = db
    .prepare(
      `SELECT * FROM automation_events
       WHERE type = ? AND project_id = ? AND status IN ('pending', 'running', 'success')
       ORDER BY id DESC
       LIMIT 1`
    )
    .get(type, projectId) as AutomationEventRow | undefined;

  return row ? parseAutomationEvent(row) : null;
}

function parseAutomationEvent(row: AutomationEventRow): AutomationEvent {
  return {
    ...row,
    payload: JSON.parse(row.payload) as AutomationEventPayload,
    result: row.result ? (JSON.parse(row.result) as AutomationEventResult) : null,
  };
}

function retryDelayMs(attemptIndex: number): number {
  return TERMINAL_RETRY_DELAYS_MS[Math.min(attemptIndex, TERMINAL_RETRY_DELAYS_MS.length - 1)];
}
