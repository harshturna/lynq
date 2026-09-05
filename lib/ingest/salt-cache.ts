/**
 * Daily visitor salt cache (design §5.1), kept free of server-only imports so
 * it is unit-testable. Cached per day, never as "today", so a warm instance
 * that lives across UTC midnight does not double-count the boundary.
 */
export type SaltLoader = (day: string) => Promise<Buffer>;

export function createSaltCache(load: SaltLoader, keep = 3) {
  const cache = new Map<string, Promise<Buffer>>();
  return async function saltFor(day: string): Promise<Buffer> {
    let hit = cache.get(day);
    if (!hit) {
      hit = load(day).catch((error) => {
        cache.delete(day);
        throw error;
      });
      cache.set(day, hit);
      // evict anything older than the newest `keep` days
      const days = [...cache.keys()].sort();
      for (const old of days.slice(0, Math.max(0, days.length - keep))) {
        cache.delete(old);
      }
    }
    return hit;
  };
}
