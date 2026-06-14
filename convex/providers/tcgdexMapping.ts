import type { ProviderCard, ProviderPrice } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Fonctions de mapping PURES (TCGdex → modèle interne). Aucune I/O.
// C'est le cœur testable du provider (PRD §8). Testées hors-ligne sur fixtures.
// ─────────────────────────────────────────────────────────────────────────

/** Brief de carte renvoyé par /v2/{lang}/cards (liste globale). */
export interface TcgdexCardBrief {
  id: string;
  localId: string;
  name: string;
}

/** Bloc cardmarket de /v2/{lang}/cards/{id} (champs utilisés). */
export interface TcgdexCardmarket {
  unit?: string;
  updated?: string;
  trend?: number | null;
  avg30?: number | null;
  low?: number | null;
}

/**
 * Construit le `searchText` bilingue : "Dracaufeu Charizard".
 * Un seul index couvre FR + EN → "Charizard" ET "Dracaufeu" matchent la carte.
 */
export function buildSearchText(nameFr?: string, nameEn?: string): string {
  return [nameFr, nameEn]
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length > 0)
    .join(" ");
}

/**
 * Déduit le `setId` depuis l'id TCGdex et le localId.
 * "sv03-125" + "125" → "sv03" ; "exu-!" + "!" → "exu".
 */
export function deriveSetId(id: string, localId: string): string {
  const suffix = `-${localId}`;
  if (localId.length > 0 && id.endsWith(suffix)) {
    return id.slice(0, id.length - suffix.length);
  }
  // Repli : tout avant le premier tiret.
  const dash = id.indexOf("-");
  return dash > 0 ? id.slice(0, dash) : id;
}

/** URL du visuel FR (qualité "high"). Chemin asset = /{lang}/{serie}/{set}/{localId}. */
export function buildImageUrl(
  serieId: string,
  setId: string,
  localId: string,
): string {
  return `https://assets.tcgdex.net/fr/${serieId}/${setId}/${localId}/high.webp`;
}

/**
 * Normalise le bloc cardmarket TCGdex vers `ProviderPrice` (EUR).
 * Retourne null si pas de prix EUR exploitable.
 */
export function mapCardmarketPrice(
  cardmarket: TcgdexCardmarket | undefined | null,
  now: number,
): ProviderPrice | null {
  if (!cardmarket) return null;
  if (cardmarket.unit && cardmarket.unit !== "EUR") return null;

  const trend = cardmarket.trend ?? undefined;
  const avg30 = cardmarket.avg30 ?? undefined;
  const low = cardmarket.low ?? undefined;
  if (trend === undefined && avg30 === undefined && low === undefined) {
    return null;
  }

  const updatedAt = cardmarket.updated
    ? Date.parse(cardmarket.updated) || now
    : now;

  return {
    source: "tcgdex",
    eurTrend: trend ?? undefined,
    eurAvg30: avg30 ?? undefined,
    eurLow: low ?? undefined,
    updatedAt,
  };
}

/**
 * Fusionne les briefs FR + EN (joints sur l'id stable inter-langue) en une
 * carte du catalogue interne. `serieId` (optionnel) produit l'URL d'image.
 */
export function mergeCatalogCard(
  fr: TcgdexCardBrief | undefined,
  en: TcgdexCardBrief | undefined,
  opts: { serieId?: string; setName?: string } = {},
): ProviderCard {
  const ref = fr ?? en;
  if (!ref) {
    throw new Error("mergeCatalogCard : au moins un brief (FR ou EN) requis");
  }
  const localId = ref.localId;
  const setId = deriveSetId(ref.id, localId);
  const nameFr = fr?.name;
  const nameEn = en?.name;

  return {
    tcgdexId: ref.id,
    nameFr,
    nameEn,
    searchText: buildSearchText(nameFr, nameEn),
    localId,
    setId,
    setName: opts.setName,
    imageUrl: opts.serieId
      ? buildImageUrl(opts.serieId, setId, localId)
      : undefined,
  };
}
