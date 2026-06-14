import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { TcgdexProvider } from "./providers/tcgdex";

// ─────────────────────────────────────────────────────────────────────────
// SCAN — partie AUTOMATIQUE (Phase B) : depuis le numéro détecté par OCR,
// trouve les candidats au catalogue PUIS va chercher dans l'API TCGdex :
//   1. enrichit automatiquement les candidats sans prix (refreshCards) ;
//   2. en repli, si la carte n'est pas au catalogue et que le set est connu,
//      la récupère directement de l'API et l'insère.
// Appels externes UNIQUEMENT via action (PRD §6). Confirmation humaine ensuite.
// ─────────────────────────────────────────────────────────────────────────

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

/** Recharge des cartes par id (avec prix à jour) pour le retour final. */
export const getByIds = internalQuery({
  args: { ids: v.array(v.id("cards")) },
  handler: async (ctx, { ids }) => {
    const out: Array<Doc<"cards">> = [];
    for (const id of ids) {
      const c = await ctx.db.get(id);
      if (c !== null) out.push(c);
    }
    return out;
  },
});

/** Upsert d'une carte récupérée de l'API (par tcgdexId), sans toucher au prix. */
export const upsertFromApi = internalMutation({
  args: { card: v.object(cardFields) },
  handler: async (ctx, { card }) => {
    const existing = await ctx.db
      .query("cards")
      .withIndex("by_tcgdexId", (q) => q.eq("tcgdexId", card.tcgdexId))
      .unique();
    if (existing !== null) {
      await ctx.db.patch(existing._id, card);
      return existing._id;
    }
    return await ctx.db.insert("cards", card);
  },
});

/**
 * Pipeline automatique du scan : numéro détecté → candidats enrichis par l'API.
 * Renvoie 0..N candidats (avec prix EUR) à CONFIRMER par l'utilisateur.
 */
export const scanLookup = action({
  args: {
    localId: v.string(),
    total: v.optional(v.number()),
    setId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Array<Doc<"cards">>> => {
    let candidates = await ctx.runQuery(api.cards.scanCandidates, args);

    // Repli : rien au catalogue mais set connu → on va chercher dans l'API.
    if (candidates.length === 0 && args.setId !== undefined) {
      const provider = new TcgdexProvider();
      const fetched = await provider.fetchCard(`${args.setId}-${args.localId}`);
      if (fetched !== null) {
        const cardId = await ctx.runMutation(internal.scan.upsertFromApi, {
          card: fetched.card,
        });
        if (fetched.price !== null) {
          await ctx.runMutation(internal.prices.setPrice, {
            cardId,
            prices: fetched.price,
          });
        }
      }
      candidates = await ctx.runQuery(api.cards.scanCandidates, args);
    }

    // Enrichissement prix automatique via l'API pour les candidats sans prix.
    const missing: Array<Id<"cards">> = candidates
      .filter((c) => c.prices === undefined)
      .map((c) => c._id);
    if (missing.length > 0) {
      await ctx.runAction(internal.prices.refreshCards, { cardIds: missing });
    }

    return await ctx.runQuery(internal.scan.getByIds, {
      ids: candidates.map((c) => c._id),
    });
  },
});
