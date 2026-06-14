// ─────────────────────────────────────────────────────────────────────────
// Logique PURE de fraîcheur des prix (testée hors-ligne, PRD §6/§8.2).
// ─────────────────────────────────────────────────────────────────────────

export const HOUR_MS = 60 * 60 * 1000;
export const STALE_CRON_MS = 24 * HOUR_MS; // cron quotidien : > 24h
export const GUARD_BUTTON_MS = 6 * HOUR_MS; // bouton manuel : garde < 6h

/** Un prix est périmé si jamais mis à jour, ou plus vieux que `maxAgeMs`. */
export function isStale(
  lastPriceUpdate: number | undefined | null,
  now: number,
  maxAgeMs: number,
): boolean {
  if (lastPriceUpdate === undefined || lastPriceUpdate === null) return true;
  return now - lastPriceUpdate > maxAgeMs;
}

/** Découpe en lots pour borner la concurrence des appels externes. */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
