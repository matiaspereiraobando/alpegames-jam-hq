import fs from 'node:fs';
import path from 'node:path';
import type { AutomationEvent } from '../types.ts';

let cachedEnv: Record<string, string> | null = null;

export async function sendTelegramMessage(text: string) {
  if (process.env.JAMHQ_TELEGRAM_DRY_RUN === '1') {
    console.log(`[telegram dry-run] ${text}`);
    return;
  }

  const token = getHermesEnv('TELEGRAM_BOT_TOKEN');
  const chatId = getHermesEnv('TELEGRAM_HOME_CHANNEL');

  if (!token || !chatId) {
    console.warn('Telegram credentials are not configured; notification skipped.');
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram send failed (${response.status}): ${body}`);
  }
}

export async function notifyAutomation(
  event: AutomationEvent,
  outcome: 'started' | 'success' | 'failed',
  detail?: string
) {
  const jamLabel = formatJamLabel(event);
  const result = event.result ?? {};
  let message = '';

  if (outcome === 'started') {
    message = `🚀 *Jam automation started* — ${jamLabel}`;
  } else if (outcome === 'success') {
    const repo = typeof result.repo_url === 'string' ? result.repo_url : 'repo unavailable';
    const vps = typeof result.vps_path === 'string' ? result.vps_path : 'VPS path unavailable';
    message = `✅ *${jamLabel} ready* — repo: ${repo} · VPS: \`${vps}\``;
  } else {
    const error = detail || event.error || 'Unknown error';
    message = `❌ *${jamLabel} automation failed* — ${error} · event: #${event.id}`;
  }

  await sendTelegramMessage(message);
}

function formatJamLabel(event: AutomationEvent) {
  const jamNumber = event.payload.jam_number;
  const padded = String(jamNumber).padStart(3, '0');
  return `Jam #${padded} ${event.payload.jam_slug}`;
}

function getHermesEnv(name: string): string | undefined {
  if (process.env[name]) {
    return process.env[name];
  }

  if (!cachedEnv) {
    cachedEnv = loadHermesEnv();
  }

  return cachedEnv[name];
}

function loadHermesEnv(): Record<string, string> {
  const envPath = path.join(process.env.HOME || '/root', '.hermes', '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const values: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    values[key] = value;
  }

  return values;
}
