const FAILED_RETRY_MS = 60_000;

type ExistingAlert = {
  sentToLine: boolean;
  lineLastAttemptAt?: Date;
  lineError?: string;
};

/** Keep first delivery, failed-delivery retries, and optional reminders distinct. */
export function shouldSendLineAlert(
  existing: ExistingAlert | null,
  reminderIntervalMinutes: number,
  now = Date.now(),
) {
  if (!existing) return true;
  if (existing.sentToLine && !existing.lineError && reminderIntervalMinutes === 0) {
    return false;
  }
  if (!existing.lineLastAttemptAt) return true;
  const waitMs = existing.lineError || !existing.sentToLine
    ? FAILED_RETRY_MS
    : reminderIntervalMinutes * 60_000;
  return now - existing.lineLastAttemptAt.getTime() >= waitMs;
}
