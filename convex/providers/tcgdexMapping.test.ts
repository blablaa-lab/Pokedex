import { describe, expect, test } from "vitest";
import {
  buildImageUrl,
  buildSearchText,
  deriveSetId,
  mapCardmarketPrice,
  mergeCatalogCard,
} from "./tcgdexMapping";

const NOW = 1_700_000_000_000;

describe("buildSearchText (bilingue FR+EN)", () => {
  test("concatène FR et EN", () => {
    expect(buildSearchText("Dracaufeu", "Charizard")).toBe(
      "Dracaufeu Charizard",
    );
  });
  test("tolère les noms manquants", () => {
    expect(buildSearchText("Dracaufeu", undefined)).toBe("Dracaufeu");
    expect(buildSearchText(undefined, "Charizard")).toBe("Charizard");
    expect(buildSearchText(undefined, undefined)).toBe("");
  });
  test("trim les espaces parasites", () => {
    expect(buildSearchText("  Pikachu ", " Pikachu ")).toBe("Pikachu Pikachu");
  });
});

describe("deriveSetId", () => {
  test("retire le suffixe -localId", () => {
    expect(deriveSetId("sv03-125", "125")).toBe("sv03");
    expect(deriveSetId("swsh3-136", "136")).toBe("swsh3");
    expect(deriveSetId("base1-4", "4")).toBe("base1");
  });
  test("gère un localId non numérique", () => {
    expect(deriveSetId("exu-!", "!")).toBe("exu");
  });
  test("gère un setId contenant un point", () => {
    expect(deriveSetId("sv03.5-1", "1")).toBe("sv03.5");
  });
});

describe("buildImageUrl", () => {
  test("construit l'URL FR haute qualité", () => {
    expect(buildImageUrl("sv", "sv03", "125")).toBe(
      "https://assets.tcgdex.net/fr/sv/sv03/125/high.webp",
    );
  });
});

describe("mapCardmarketPrice (TCGdex → EUR)", () => {
  // Fixture réelle (Charizard ex, sv03-125, sondée le 2026-06-13).
  const realCardmarket = {
    unit: "EUR",
    updated: "2026-06-13T22:58:40.600Z",
    trend: 3.51,
    avg30: 4.04,
    low: 2,
  };

  test("extrait trend/avg30/low + source tcgdex", () => {
    const p = mapCardmarketPrice(realCardmarket, NOW);
    expect(p).not.toBeNull();
    expect(p!.source).toBe("tcgdex");
    expect(p!.eurTrend).toBe(3.51);
    expect(p!.eurAvg30).toBe(4.04);
    expect(p!.eurLow).toBe(2);
    // updatedAt = instant du fetch fourni (pas la date de marché TCGdex).
    expect(p!.updatedAt).toBe(NOW);
  });

  test("null si bloc absent", () => {
    expect(mapCardmarketPrice(undefined, NOW)).toBeNull();
    expect(mapCardmarketPrice(null, NOW)).toBeNull();
  });

  test("null si devise non EUR", () => {
    expect(
      mapCardmarketPrice({ unit: "USD", trend: 5 }, NOW),
    ).toBeNull();
  });

  test("null si tous les montants sont absents", () => {
    expect(
      mapCardmarketPrice(
        { unit: "EUR", trend: null, avg30: null, low: null },
        NOW,
      ),
    ).toBeNull();
  });

  test("updatedAt = now si date absente", () => {
    expect(mapCardmarketPrice({ unit: "EUR", trend: 1 }, NOW)!.updatedAt).toBe(
      NOW,
    );
  });
});

describe("mergeCatalogCard (jointure FR+EN sur id stable)", () => {
  const fr = { id: "base1-4", localId: "4", name: "Dracaufeu" };
  const en = { id: "base1-4", localId: "4", name: "Charizard" };

  test("fusionne les deux langues + searchText bilingue + image", () => {
    const card = mergeCatalogCard(fr, en, { serieId: "base", setName: "Set de Base" });
    expect(card.tcgdexId).toBe("base1-4");
    expect(card.nameFr).toBe("Dracaufeu");
    expect(card.nameEn).toBe("Charizard");
    expect(card.searchText).toBe("Dracaufeu Charizard");
    expect(card.localId).toBe("4");
    expect(card.setId).toBe("base1");
    expect(card.setName).toBe("Set de Base");
    expect(card.imageUrl).toBe(
      "https://assets.tcgdex.net/fr/base/base1/4/high.webp",
    );
  });

  test("tolère une carte présente seulement en EN", () => {
    const card = mergeCatalogCard(undefined, en);
    expect(card.nameFr).toBeUndefined();
    expect(card.nameEn).toBe("Charizard");
    expect(card.searchText).toBe("Charizard");
    expect(card.imageUrl).toBeUndefined(); // pas de serieId fourni
  });
});
