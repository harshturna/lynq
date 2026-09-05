/**
 * Client timestamps are accepted as sent or dropped (design §7.2 step 7),
 * never rewritten: the accepted window is 24 hours behind to 5 minutes ahead
 * of the server's receive time.
 */
export const PAST_LIMIT_MS = 24 * 60 * 60 * 1000;
export const FUTURE_LIMIT_MS = 5 * 60 * 1000;

export function boundTimestamp(
  clientMs: number,
  receivedAt: Date
): Date | null {
  const delta = clientMs - receivedAt.getTime();
  if (delta < -PAST_LIMIT_MS || delta > FUTURE_LIMIT_MS) return null;
  return new Date(clientMs);
}
