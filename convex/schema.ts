import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Échelle d'état Cardmarket — cohérente avec la source de prix EUR.
const conditionValidator = v.union(
  v.literal("MT"), // Mint
  v.literal("NM"), // Near Mint
  v.literal("EX"), // Excellent
  v.literal("GD"), // Good
  v.literal("LP"), // Light Played
  v.literal("PL"), // Played
  v.literal("PO"), // Poor
);

// Langue de la carte PHYSIQUE possédée (un collectionneur FR peut avoir du JP).
const languageValidator = v.union(
  v.literal("fr"),
  v.literal("en"),
  v.literal("jp"),
  v.literal("other"),
);

export default defineSchema({
  // ─────────────────────────────────────────────────────────────
  // AUTH — fourni clé en main par Convex Auth.
  // (users, authSessions, authAccounts, authVerificationCodes, …)
  // ─────────────────────────────────────────────────────────────
  ...authTables,

  // ─────────────────────────────────────────────────────────────
  // CATALOGUE PARTAGÉ — seedé en masse depuis TCGdex.
  // Identité quasi statique. UNE ligne par carte, partagée par tous
  // les users. La recherche se fait en local sur cette table.
  // ─────────────────────────────────────────────────────────────
  cards: defineTable({
    tcgdexId: v.string(), // identité stable inter-langue, ex. "swsh3-136"
    nameFr: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    searchText: v.string(), // "Dracaufeu Charizard" → 1 seul index FR+EN
    localId: v.string(), // numéro de collecteur dans le set, ex. "136"
    setId: v.string(),
    setName: v.optional(v.string()),
    rarity: v.optional(v.string()),
    imageUrl: v.optional(v.string()), // visuel FR (cohérent avec la carte en main)

    // PRIX = volatil. Rempli paresseusement, JAMAIS au seed.
    prices: v.optional(
      v.object({
        source: v.string(), // "tcgdex" | "cardmarket-bridge"
        eurTrend: v.optional(v.number()),
        eurAvg30: v.optional(v.number()),
        eurLow: v.optional(v.number()),
        updatedAt: v.number(),
      }),
    ),
    lastPriceUpdate: v.optional(v.number()), // sert au filtrage cron (stale > 24h)

    phash: v.optional(v.string()), // phase 2 : matching visuel. Colonne prête.
  })
    .index("by_tcgdexId", ["tcgdexId"])
    .index("by_set", ["setId"])
    .index("by_local", ["localId"]) // recherche par numéro de collecteur seul
    .index("by_stale_price", ["lastPriceUpdate"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["setId", "rarity"],
    }),

  // ─────────────────────────────────────────────────────────────
  // SETS — métadonnées + TABLE DE CORRESPONDANCE pour le bridge prix.
  // ptcgioId est rempli par le script de mapping (fuzzy-match une fois,
  // correction manuelle des cas ambigus). Null = pas de bridge pour ce set.
  // ─────────────────────────────────────────────────────────────
  sets: defineTable({
    tcgdexId: v.string(),
    name: v.string(),
    cardCount: v.optional(v.number()),
    releaseDate: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    symbolUrl: v.optional(v.string()),
    ptcgioId: v.optional(v.string()), // id pokemontcg.io mappé (bridge)
  }).index("by_tcgdexId", ["tcgdexId"]),

  // ─────────────────────────────────────────────────────────────
  // POKÉDEX — catalogues de l'utilisateur.
  // ─────────────────────────────────────────────────────────────
  pokedexes: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    coverCardId: v.optional(v.id("cards")),
  }).index("by_user", ["userId"]),

  // ─────────────────────────────────────────────────────────────
  // ENTRÉES DE COLLECTION — une carte possédée dans un pokédex.
  // Référence le catalogue (cardId) → la carte n'est cachée qu'une fois.
  // ─────────────────────────────────────────────────────────────
  cardEntries: defineTable({
    pokedexId: v.id("pokedexes"),
    userId: v.id("users"), // dénormalisé pour le filtrage de sécurité côté query
    cardId: v.id("cards"),
    quantity: v.number(),
    condition: v.optional(conditionValidator),
    language: v.optional(languageValidator),
    isHolo: v.optional(v.boolean()),
    isReverse: v.optional(v.boolean()),
    isFirstEdition: v.optional(v.boolean()),
    capturedImageId: v.optional(v.id("_storage")), // photo de scan de l'user
    acquiredPriceEur: v.optional(v.number()), // prix payé → permet le P&L
    notes: v.optional(v.string()),
  })
    .index("by_pokedex", ["pokedexId"])
    .index("by_user", ["userId"])
    .index("by_pokedex_and_card", ["pokedexId", "cardId"]),
});
