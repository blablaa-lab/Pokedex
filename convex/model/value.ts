import type { Id } from "../_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────
// Logique PURE de valorisation et de batch (testée hors-ligne, PRD §8).
// ─────────────────────────────────────────────────────────────────────────

export interface PriceLike {
  eurAvg30?: number;
  eurTrend?: number;
  eurLow?: number;
}

/**
 * Estimation EUR d'UNE carte : avg30 en priorité, puis trend, puis low.
 * null si aucun prix → l'entrée ne compte pas dans la valeur (mais est signalée).
 */
export function cardEstimateEur(prices?: PriceLike | null): number | null {
  if (!prices) return null;
  return prices.eurAvg30 ?? prices.eurTrend ?? prices.eurLow ?? null;
}

export interface ValuationItem {
  quantity: number;
  estimate: number | null;
}

export interface Valuation {
  totalEur: number;
  pricedCount: number;
  unpricedCount: number;
}

/** Valeur totale = Σ quantité × estimation ; compte les entrées sans prix. */
export function computeTotalValue(items: ValuationItem[]): Valuation {
  let totalEur = 0;
  let pricedCount = 0;
  let unpricedCount = 0;
  for (const it of items) {
    if (it.estimate === null) {
      unpricedCount += 1;
    } else {
      totalEur += it.quantity * it.estimate;
      pricedCount += 1;
    }
  }
  return { totalEur, pricedCount, unpricedCount };
}

/**
 * Ids de cartes UNIQUES (dédoublonnés) à charger pour une liste d'entrées.
 * Évite le N+1 : on ne fait qu'UN point-lookup par carte distincte (PRD §8.1).
 */
export function uniqueCardIds(
  entries: { cardId: Id<"cards"> }[],
): Id<"cards">[] {
  const seen = new Set<string>();
  const out: Id<"cards">[] = [];
  for (const e of entries) {
    if (!seen.has(e.cardId)) {
      seen.add(e.cardId);
      out.push(e.cardId);
    }
  }
  return out;
}
