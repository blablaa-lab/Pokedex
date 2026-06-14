import { describe, expect, test } from "vitest";
import { cardEstimateEur, computeTotalValue, uniqueCardIds } from "./value";
import type { Id } from "../_generated/dataModel";

describe("cardEstimateEur (priorité avg30 > trend > low)", () => {
  test("avg30 prioritaire", () => {
    expect(cardEstimateEur({ eurAvg30: 4, eurTrend: 3, eurLow: 2 })).toBe(4);
  });
  test("repli trend puis low", () => {
    expect(cardEstimateEur({ eurTrend: 3, eurLow: 2 })).toBe(3);
    expect(cardEstimateEur({ eurLow: 2 })).toBe(2);
  });
  test("null si pas de prix", () => {
    expect(cardEstimateEur(null)).toBeNull();
    expect(cardEstimateEur(undefined)).toBeNull();
    expect(cardEstimateEur({})).toBeNull();
  });
});

describe("computeTotalValue", () => {
  test("Σ quantité × estimation", () => {
    const v = computeTotalValue([
      { quantity: 2, estimate: 4.04 }, // 8.08
      { quantity: 1, estimate: 335.61 }, // 335.61
    ]);
    expect(v.totalEur).toBeCloseTo(343.69, 2);
    expect(v.pricedCount).toBe(2);
    expect(v.unpricedCount).toBe(0);
  });
  test("les entrées sans prix sont comptées à part, pas dans le total", () => {
    const v = computeTotalValue([
      { quantity: 3, estimate: 1 }, // 3
      { quantity: 5, estimate: null }, // ignorée
    ]);
    expect(v.totalEur).toBe(3);
    expect(v.pricedCount).toBe(1);
    expect(v.unpricedCount).toBe(1);
  });
  test("liste vide", () => {
    expect(computeTotalValue([])).toEqual({
      totalEur: 0,
      pricedCount: 0,
      unpricedCount: 0,
    });
  });
});

describe("uniqueCardIds (dédoublonnage anti-N+1)", () => {
  test("ne garde qu'un id par carte distincte, dans l'ordre", () => {
    const a = "card_a" as Id<"cards">;
    const b = "card_b" as Id<"cards">;
    const ids = uniqueCardIds([
      { cardId: a },
      { cardId: b },
      { cardId: a },
      { cardId: a },
    ]);
    expect(ids).toEqual([a, b]);
  });
});
