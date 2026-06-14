import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { TcgdexProvider } from "./providers/tcgdex";

// ─────────────────────────────────────────────────────────────────────────
// SEED du catalogue (Itération 0 — identité depuis TCGdex, JAMAIS les prix).
// Lancer : `npx convex run seed:run`  (ou `seed:run '{"force":true}'` pour
// réinitialiser). Les mutations/query sont internes ; seule `run` est publique
// (la deploy key dev ne peut pas déclencher d'action interne via le CLI).
// ⚠️ À SÉCURISER / RETIRER avant toute mise en prod (action de maintenance).
// ─────────────────────────────────────────────────────────────────────────

const setFields = {
  tcgdexId: v.string(),
  name: v.string(),
  cardCount: v.optional(v.number()),
  releaseDate: v.optional(v.string()),
  logoUrl: v.optional(v.string()),
  symbolUrl: v.optional(v.string()),
};

const cardFields = {
  tcgdexId: v.string(),
  nameFr: v.optional(v.string()),
  nameEn: v.optional(v.string()),
  searchText: v.string(),
  localId: v.string(),
  setId: v.string(),
  setName: v.optional(v.string()),
  rarity: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
};

export const countCatalog = internalQuery({
  args: {},
  handler: async (ctx) => {
    const firstCard = await ctx.db.query("cards").first();
    const firstSet = await ctx.db.query("sets").first();
    return { hasCards: firstCard !== null, hasSets: firstSet !== null };
  },
});

/** Supprime une page de cartes + sets. Retourne true s'il reste à nettoyer. */
export const clearPage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cards = await ctx.db.query("cards").take(1000);
    for (const c of cards) await ctx.db.delete(c._id);
    const sets = await ctx.db.query("sets").take(1000);
    for (const s of sets) await ctx.db.delete(s._id);
    return cards.length === 1000 || sets.length === 1000;
  },
});

export const insertSets = internalMutation({
  args: { sets: v.array(v.object(setFields)) },
  handler: async (ctx, { sets }) => {
    for (const s of sets) await ctx.db.insert("sets", s);
  },
});

export const insertCards = internalMutation({
  args: { cards: v.array(v.object(cardFields)) },
  handler: async (ctx, { cards }) => {
    for (const c of cards) await ctx.db.insert("cards", c);
  },
});

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export const run = action({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const state = await ctx.runQuery(internal.seed.countCatalog);
    if (state.hasCards && !force) {
      return "Catalogue déjà seedé — relancer avec {\"force\":true} pour réinitialiser.";
    }
    if (force) {
      while (await ctx.runMutation(internal.seed.clearPage)) {
        /* nettoyage paginé */
      }
    }

    const provider = new TcgdexProvider();
    const { sets, cards } = await provider.fetchCatalog();

    for (const batch of chunk(sets, 500)) {
      await ctx.runMutation(internal.seed.insertSets, { sets: batch });
    }
    for (const batch of chunk(cards, 500)) {
      await ctx.runMutation(internal.seed.insertCards, { cards: batch });
    }

    return `Seed OK : ${sets.length} sets, ${cards.length} cartes.`;
  },
});
