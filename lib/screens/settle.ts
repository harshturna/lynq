/**
 * A screen section (design §10): every query a screen starts is settled to
 * this shape at creation time, so no promise rejects across the server
 * boundary and one failed section never takes the screen down. Errors are
 * logged with the screen and query name.
 */
export type Section<T> = { ok: true; data: T } | { ok: false; name: string };

export function settle<T>(name: string, p: Promise<T>): Promise<Section<T>> {
  return p.then(
    (data) => ({ ok: true as const, data }),
    (err: unknown) => {
      console.error(`[screen] ${name} failed:`, err);
      return { ok: false as const, name };
    }
  );
}

export function ok<T>(data: T): Section<T> {
  return { ok: true, data };
}
