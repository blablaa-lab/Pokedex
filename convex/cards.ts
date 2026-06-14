import { v } from "convex/values";
import { query } from "./_generated/server";

// Lecture du catalogue partagé (`cards`). Pas de filtrage user : le catalogue
// est commun à tous. La recherche bilingue arrive en P4, la fiche en P5.

/** Récupère une carte par son id TCGdex (identité stable). */
export const getByTcgdexId = query({
  args: { tcgdexId: v.string() },
  handler: async (ctx, { tcgdexId }) => {
    return await ctx.db
      .query("cards")
      .withIndex("by_tcgdexId", (q) => q.eq("tcgdexId", tcgdexId))
      .unique();
  },
});

/** Récupère une carte par son id Convex (fiche carte, P5). */
export const get = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    return await ctx.db.get(cardId);
  },
});

const MAX_RESULTS = 60;

/**
 * Recherche bilingue sur l'index `search_text` (FR ET EN via `searchText`),
 * avec filtre set optionnel et filtre numéro de collecteur (`localId`).
 * - `text` non vide → recherche plein-texte (option : restreinte au set).
 * - `text` vide + `setId` → parcourt le set (filtre numéro éventuel).
 * « Charizard » et « Dracaufeu » renvoient la même carte (test P4).
 */
export const search = query({
  args: {
    text: v.optional(v.string()),
    setId: v.optional(v.string()),
    localId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { text, setId, localId, limit }) => {
    const max = Math.min(limit ?? 40, MAX_RESULTS);
    const trimmed = (text ?? "").trim();
    let cards;

    if (trimmed.length > 0) {
      cards = await ctx.db
        .query("cards")
        .withSearchIndex("search_text", (q) => {
          const base = q.search("searchText", trimmed);
          return setId ? base.eq("setId", setId) : base;
        })
        // On élargit la prise quand un filtre numéro post-filtrera.
        .take(localId ? 200 : max);
    } else if (setId) {
      cards = await ctx.db
        .query("cards")
        .withIndex("by_set", (q) => q.eq("setId", setId))
        .take(localId ? 600 : max);
    } else {
      return []; // aucun critère
    }

    if (localId) {
      cards = cards.filter((c) => c.localId === localId);
    }
    return cards.slice(0, max);
  },
});
