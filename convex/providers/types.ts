// ─────────────────────────────────────────────────────────────────────────
// Interface STABLE du fournisseur de cartes (PRD §2 : abstraction obligatoire).
// Tout accès aux sources externes passe par là. Aujourd'hui : TCGdex source
// unique (verdict CAS A, cf. DECISIONS.md). On doit pouvoir changer
// d'implémentation (ou ajouter un bridge prix) sans toucher au reste du code.
// ─────────────────────────────────────────────────────────────────────────

/** Métadonnées d'un set, normalisées vers le modèle interne (`sets`). */
export interface ProviderSet {
  tcgdexId: string;
  name: string;
  cardCount?: number;
  releaseDate?: string;
  logoUrl?: string;
  symbolUrl?: string;
}

/** Identité d'une carte du catalogue, normalisée (`cards`, hors prix). */
export interface ProviderCard {
  tcgdexId: string;
  nameFr?: string;
  nameEn?: string;
  searchText: string;
  localId: string;
  setId: string;
  setName?: string;
  rarity?: string;
  imageUrl?: string;
}

/** Prix normalisé (EUR), volatil — jamais seedé, cf. PRD §3/§6. */
export interface ProviderPrice {
  source: string; // "tcgdex" | "cardmarket-bridge"
  eurTrend?: number;
  eurAvg30?: number;
  eurLow?: number;
  updatedAt: number; // epoch ms
}

/** Données complètes pour le seed du catalogue. */
export interface CatalogData {
  sets: ProviderSet[];
  cards: ProviderCard[];
}

/**
 * Contrat du fournisseur. Implémenté par `TcgdexProvider`.
 * - `fetchCatalog` : identité (seed massif, sans prix).
 * - `fetchPrice` : prix d'une carte (utilisé par `refreshPrices`, P6).
 */
export interface CardProvider {
  fetchCatalog: () => Promise<CatalogData>;
  fetchPrice: (tcgdexId: string) => Promise<ProviderPrice | null>;
}
