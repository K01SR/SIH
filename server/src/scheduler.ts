import cron from 'node-cron';
import { env } from './config/env';
import { EscalationEngine } from './engines/escalation.engine';

let started = false;

/**
 * Starts the periodic escalation sweep. Runs on the configured cron cadence
 * and evaluates SLA breaches, EVC delays, overdue undertakings and expiring
 * documents, raising alerts and escalations accordingly.
 */
export function startEscalationScheduler() {
  if (started) return;
  started = true;
  if (!cron.validate(env.escalationCron)) {
    console.warn(`[scheduler] invalid cron expression: ${env.escalationCron}`);
    return;
  }
  cron.schedule(env.escalationCron, async () => {
    try {
      const summary = await EscalationEngine.sweep();
      console.log('[scheduler] escalation sweep', summary);
    } catch (err) {
      console.error('[scheduler] escalation sweep failed', err);
    }
  });
  console.log(`[scheduler] escalation sweep scheduled (${env.escalationCron})`);
}

/** Exposed for manual/test invocation. */
export async function runSweepNow() {
  return EscalationEngine.sweep();
}
