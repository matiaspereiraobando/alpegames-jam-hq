import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { AutomationEvent, AutomationEventResult } from '../types.ts';

export interface AutomationRunnerResult {
  status: 'success' | 'failed';
  log_path: string;
  result: AutomationEventResult | null;
  error?: string;
}

const SCRIPT_TIMEOUT_MS = 600_000;
const LOG_DIR = process.env.JAMHQ_AUTOMATION_LOG_DIR || '/var/log/jamhq-automation';

export async function runProjectCreatedAutomation(
  event: AutomationEvent
): Promise<AutomationRunnerResult> {
  const jamNumber = String(event.payload.jam_number);
  const jamSlug = event.payload.jam_slug;
  const logPath = await ensureLogPath(event.id);
  const scriptPath = path.resolve(process.cwd(), 'scripts/create-jam-repo.sh');

  return new Promise<AutomationRunnerResult>((resolve) => {
    const child = spawn(
      scriptPath,
      [jamNumber, jamSlug, '--skip-hq-register'],
      {
        cwd: process.cwd(),
        env: process.env,
        signal: AbortSignal.timeout(SCRIPT_TIMEOUT_MS),
      }
    );

    const logStream = fs.createWriteStream(logPath, { flags: 'a' });
    let combined = '';
    let parsedResult: AutomationEventResult | null = null;
    let settled = false;

    const append = (chunk: Buffer | string, streamName: 'stdout' | 'stderr') => {
      const text = chunk.toString();
      combined += text;
      logStream.write(`[${streamName}] ${text}`);
      const matches = text.match(/JAMHQ_RESULT=(.+)$/m);
      if (matches) {
        try {
          parsedResult = JSON.parse(matches[1]) as AutomationEventResult;
        } catch (error) {
          logStream.write(`[worker] Failed to parse JAMHQ_RESULT: ${String(error)}\n`);
        }
      }
    };

    child.stdout.on('data', (chunk) => append(chunk, 'stdout'));
    child.stderr.on('data', (chunk) => append(chunk, 'stderr'));

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      logStream.end(`[worker] Spawn error: ${error.message}\n`);
      resolve({
        status: 'failed',
        log_path: logPath,
        result: parsedResult,
        error: error.message,
      });
    });

    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      const error = code === 0 ? undefined : summarizeFailure(code, signal, combined);
      logStream.end(`[worker] Process finished with code=${code ?? 'null'} signal=${signal ?? 'null'}\n`);
      resolve({
        status: code === 0 ? 'success' : 'failed',
        log_path: logPath,
        result: parsedResult,
        error,
      });
    });
  });
}

async function ensureLogPath(eventId: number) {
  await fs.promises.mkdir(LOG_DIR, { recursive: true });
  return path.join(LOG_DIR, `${eventId}.log`);
}

function summarizeFailure(code: number | null, signal: NodeJS.Signals | null, combinedLog: string) {
  const tail = combinedLog.trim().split(/\r?\n/).slice(-50).join(' | ');
  if (signal === 'SIGTERM' || signal === 'SIGKILL' || signal === 'SIGABRT') {
    return `Automation timed out or was killed (${signal}). ${tail}`.trim();
  }

  return `Automation exited with code ${code ?? 'unknown'}. ${tail}`.trim();
}
