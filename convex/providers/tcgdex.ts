import type {
  CardProvider,
  CatalogData,
  ProviderCard,
  ProviderPrice,
  ProviderSet,
} from "./types";
import {
  deriveSetId,
  mapCardmarketPrice,
  mergeCatalogCard,
} from "./tcgdexMapping";
import type { TcgdexCardBrief } from "./tcgdexMapping";

const BASE = "https://api.tcgdex.net/v2";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TCGdex ${res.status} sur ${url}`);
  }
  return (await res.json()) as T;
}

interface TcgdexSetBrief {
  id: string;
  name: string;
  cardCount?: { total?: number; official?: number };
  logo?: string;
  symbol?: string;
}

interface TcgdexSerieDetail {
  id: string;
  sets?: { id: string }[];
}

interface TcgdexFullCard {
  pricing?: { cardmarket?: Parameters<typeof mapCardmarketPrice>[0] };
}

/**
 * Fournisseur TCGdex — source unique (verdict CAS A, cf. DECISIONS.md).
 * Toujours appelé depuis une action Convex (jamais le client).
 */
export class TcgdexProvider implements CardProvider {
  /**
   * Catalogue complet en ~22 appels : briefs FR+EN (1 chacun), liste des sets
   * (1), et le mapping set→série (19 détails de séries) pour les URLs d'images.
   */
  async fetchCatalog(): Promise<CatalogData> {
    const [frBriefs, enBriefs, setBriefs, serieList] = await Promise.all([
      fetchJson<TcgdexCardBrief[]>(`${BASE}/fr/cards`),
      fetchJson<TcgdexCardBrief[]>(`${BASE}/en/cards`),
      fetchJson<TcgdexSetBrief[]>(`${BASE}/fr/sets`),
      fetchJson<{ id: string }[]>(`${BASE}/fr/series`),
    ]);

    // set → série (pour construire les URLs d'images /{lang}/{serie}/{set}/...).
    const setToSerie = new Map<string, string>();
    const serieDetails = await Promise.all(
      serieList.map((s) =>
        fetchJson<TcgdexSerieDetail>(`${BASE}/fr/series/${s.id}`),
      ),
    );
    for (const serie of serieDetails) {
      for (const set of serie.sets ?? []) {
        setToSerie.set(set.id, serie.id);
      }
    }

    const setNameById = new Map<string, string>();
    const sets: ProviderSet[] = setBriefs.map((s) => {
      setNameById.set(s.id, s.name);
      return {
        tcgdexId: s.id,
        name: s.name,
        cardCount: s.cardCount?.total ?? s.cardCount?.official,
        logoUrl: s.logo ? `${s.logo}/high.webp` : undefined,
        symbolUrl: s.symbol ? `${s.symbol}.webp` : undefined,
      };
    });

    const enById = new Map<string, TcgdexCardBrief>();
    for (const c of enBriefs) enById.set(c.id, c);

    const seen = new Set<string>();
    const cards: ProviderCard[] = [];
    for (const fr of frBriefs) {
      seen.add(fr.id);
      const setId = deriveSetId(fr.id, fr.localId);
      cards.push(
        mergeCatalogCard(fr, enById.get(fr.id), {
          serieId: setToSerie.get(setId),
          setName: setNameById.get(setId),
        }),
      );
    }
    // Cartes présentes uniquement côté EN (rare, mais on ne les perd pas).
    for (const en of enBriefs) {
      if (seen.has(en.id)) continue;
      const setId = deriveSetId(en.id, en.localId);
      cards.push(
        mergeCatalogCard(undefined, en, {
          serieId: setToSerie.get(setId),
          setName: setNameById.get(setId),
        }),
      );
    }

    return { sets, cards };
  }

  /** Prix EUR d'une carte (utilisé par refreshPrices, P6). */
  async fetchPrice(tcgdexId: string): Promise<ProviderPrice | null> {
    const card = await fetchJson<TcgdexFullCard>(
      `${BASE}/fr/cards/${tcgdexId}`,
    );
    return mapCardmarketPrice(card.pricing?.cardmarket, Date.now());
  }
}
