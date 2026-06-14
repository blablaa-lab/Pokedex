import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { chunk, GUARD_BUTTON_MS, isStale, STALE_CRON_MS } from "./model/prices";
import { TcgdexProvider } from "./providers/tcgdex";

// ─────────────────────────────────────────────────────────────────────────
// PRIX — une seule logique de refresh (via cardProvider), 3 déclencheurs :
// 1. à l'ajout d'une carte (planifié depuis cardEntries.add)
// 2. cron quotidien (stale > 24h ET référencé par ≥ 1 entrée)
// 3. bouton manuel scopé au pokédex (garde : pas de refetch si < 6h)
// Appels externes UNIQUEMENT dans des actions (PRD §6). Batché.
// ─────────────────────────────────────────────────────────────────────────

const priceValidator = v.object({
  source: v.string(),
  eurTrend: v.optional(v.number()),
  eurAvg30: v.optional(v.number()),
  eurLow: v.optional(v.number()),
  updatedAt: v.number(),
});

/** Écrit le prix d'une carte + son horodatage de fraîcheur. */
export const setPrice = internalMutation({
  args: { cardId: v.id("cards"), prices: priceValidator },
  handler: async (ctx, { cardId, prices }) => {
    await ctx.db.patch(cardId, { prices, lastPriceUpdate: prices.updatedAt });
  },
});

/** tcgdexId des cartes ciblées (l'action a besoin de l'id externe). */
export const refreshTargets = internalQuery({
  args: { cardIds: v.array(v.id("cards")) },
  handler: async (ctx, { cardIds }) => {
    const out: { cardId: Id<"cards">; tcgdexId: string }[] = [];
    for (const id of cardIds) {
      const card = await ctx.db.get(id);
      if (card !== null) out.push({ cardId: id, tcgdexId: card.tcgdexId });
    }
    return out;
  },
});

/** Cœur du refresh : batché (concurrence bornée), via le cardProvider. */
export const refreshCards = internalAction({
  args: { cardIds: v.array(v.id("cards")) },
  handler: async (
    ctx,
    { cardIds },
  ): Promise<{ attempted: number; updated: number }> => {
    const targets = await ctx.runQuery(internal.prices.refreshTargets, {
      cardIds,
    });
    const provider = new TcgdexProvider();
    let updated = 0;

    for (const batch of chunk(targets, 8)) {
      const prices = await Promise.all(
        batch.map((t) => provider.fetchPrice(t.tcgdexId).catch(() => null)),
      );
      await Promise.all(
        prices.map((price, i) => {
          if (price === null) return undefined;
          updated += 1;
          return ctx.runMutation(internal.prices.setPrice, {
            cardId: batch[i].cardId,
            prices: price,
          });
        }),
      );
    }
    return { attempted: targets.length, updated };
  },
});

/** Sélection du cron : cartes RÉFÉRENCÉES (≥1 entrée) ET périmées (> 24h). */
export const selectStaleReferenced = internalQuery({
  args: { now: v.optional(v.number()), maxAgeMs: v.optional(v.number()) },
  handler: async (ctx, { now, maxAgeMs }) => {
    const at = now ?? Date.now();
    const threshold = maxAgeMs ?? STALE_CRON_MS;

    const entries = await ctx.db.query("cardEntries").collect();
    const referenced = new Set(entries.map((e) => e.cardId));

    const stale: Id<"cards">[] = [];
    for (const cardId of referenced) {
      const card = await ctx.db.get(cardId);
      if (card === null) continue;
      if (isStale(card.lastPriceUpdate, at, threshold)) stale.push(cardId);
    }
    return stale;
  },
});

/** Déclencheur 2 — cron quotidien. */
export const refreshStaleReferenced = internalAction({
  args: {},
  handler: async (ctx): Promise<{ attempted: number; updated: number }> => {
    const cardIds = await ctx.runQuery(internal.prices.selectStaleReferenced, {});
    if (cardIds.length === 0) return { attempted: 0, updated: 0 };
    return await ctx.runAction(internal.prices.refreshCards, { cardIds });
  },
});

/** Cartes d'un pokédex possédé, filtrées par la garde < 6h (bouton manuel). */
export const stalePokedexCardIds = internalQuery({
  args: {
    pokedexId: v.id("pokedexes"),
    userId: v.id("users"),
    now: v.optional(v.number()),
  },
  handler: async (ctx, { pokedexId, userId, now }) => {
    const pokedex = await ctx.db.get(pokedexId);
    if (pokedex === null || pokedex.userId !== userId) return null;

    const at = now ?? Date.now();
    const entries = await ctx.db
      .query("cardEntries")
      .withIndex("by_pokedex", (q) => q.eq("pokedexId", pokedexId))
      .collect();

    const ids = new Set<Id<"cards">>();
    for (const e of entries) {
      const card = await ctx.db.get(e.cardId);
      if (card !== null && isStale(card.lastPriceUpdate, at, GUARD_BUTTON_MS)) {
        ids.add(e.cardId);
      }
    }
    return [...ids];
  },
});

/** Déclencheur 3 — bouton manuel, scopé au pokédex courant (garde < 6h). */
export const refreshPokedex = action({
  args: { pokedexId: v.id("pokedexes") },
  handler: async (
    ctx,
    { pokedexId },
  ): Promise<{ attempted: number; updated: number; skipped?: boolean }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Non authentifié");

    const cardIds = await ctx.runQuery(internal.prices.stalePokedexCardIds, {
      pokedexId,
      userId,
    });
    if (cardIds === null) throw new Error("Pokédex introuvable ou non autorisé");
    if (cardIds.length === 0) return { attempted: 0, updated: 0, skipped: true };

    return await ctx.runAction(internal.prices.refreshCards, { cardIds });
  },
});
