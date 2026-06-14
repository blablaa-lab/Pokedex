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
