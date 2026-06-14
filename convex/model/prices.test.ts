import { describe, expect, test } from "vitest";
import { chunk, GUARD_BUTTON_MS, isStale, STALE_CRON_MS } from "./prices";

const NOW = 1_700_000_000_000;

describe("isStale", () => {
  test("jamais mis à jour → périmé", () => {
    expect(isStale(undefined, NOW, STALE_CRON_MS)).toBe(true);
    expect(isStale(null, NOW, STALE_CRON_MS)).toBe(true);
  });
  test("plus vieux que le seuil → périmé", () => {
    expect(isStale(NOW - STALE_CRON_MS - 1, NOW, STALE_CRON_MS)).toBe(true);
  });
  test("plus récent que le seuil → frais", () => {
    expect(isStale(NOW - 1000, NOW, STALE_CRON_MS)).toBe(false);
    expect(isStale(NOW - GUARD_BUTTON_MS + 1000, NOW, GUARD_BUTTON_MS)).toBe(false);
  });
});

describe("chunk", () => {
  test("découpe en lots bornés", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});
