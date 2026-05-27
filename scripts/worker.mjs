import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  claimNextPendingEvent,
  markAutomationEventFailure,
  markAutomationEventSuccess,
  resetStaleRunningEvents,
} = require('../lib/automation/events.ts');
const { runProjectCreatedAutomation } = require('../lib/automation/runner.ts');
const { notifyAutomation } = require('../lib/automation/telegram.ts');

const POLL_INTERVAL_MS = Number(process.env.JAMHQ_AUTOMATION_POLL_INTERVAL_MS || 2000);
const CRASH_RECOVERY_MINUTES = Number(process.env.JAMHQ_AUTOMATION_CRASH_RECOVERY_MINUTES || 10);

async function main() {
  await recoverStaleEvents();

  while (true) {
    try {
      const event = claimNextPendingEvent();
      if (!event) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      await safelyNotify(event, 'started');

      if (event.type !== 'project.created') {
        const updated = markAutomationEventFailure({
          id: event.id,
          error: `Unsupported automation event type: ${event.type}`,
        });
        if (updated?.status === 'failed') {
          await safelyNotify(updated, 'failed', updated.error || undefined);
        }
        continue;
      }

      const outcome = await runProjectCreatedAutomation(event);
      if (outcome.status === 'success') {
        const updated = markAutomationEventSuccess({
          id: event.id,
          result: outcome.result,
          log_path: outcome.log_path,
        });
        if (updated) {
          await safelyNotify(updated, 'success');
        }
      } else {
        const updated = markAutomationEventFailure({
          id: event.id,
          error: outcome.error || 'Automation failed',
          log_path: outcome.log_path,
        });
        if (updated?.status === 'failed') {
          await safelyNotify(updated, 'failed', updated.error || undefined);
        }
      }
    } catch (error) {
      console.error('Worker loop error:', error);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

async function recoverStaleEvents() {
  const staleBefore = new Date(Date.now() - CRASH_RECOVERY_MINUTES * 60_000).toISOString();
  const recovered = resetStaleRunningEvents(staleBefore);
  if (recovered > 0) {
    console.log(`Recovered ${recovered} stale automation event(s).`);
  }
}

async function safelyNotify(event, outcome, detail) {
  try {
    await notifyAutomation(event, outcome, detail);
  } catch (error) {
    console.error(`Telegram notification failed for event ${event.id}:`, error);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error('Automation worker crashed:', error);
  process.exit(1);
});
