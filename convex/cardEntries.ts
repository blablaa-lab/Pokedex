import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { currentUserId, requireUserId } from "./authz";
import { cardEstimateEur, computeTotalValue, uniqueCardIds } from "./model/value";

// ─────────────────────────────────────────────────────────────────────────
// ENTRÉES DE COLLECTION — cartes possédées dans un pokédex. Tout est filtré
// par le userId de l'auth. Dédoublonnage par (pokédex, carte) (PRD §8).
// ─────────────────────────────────────────────────────────────────────────

const conditionValidator = v.union(
  v.literal("MT"),
  v.literal("NM"),
  v.literal("EX"),
  v.literal("GD"),
  v.literal("LP"),
  v.literal("PL"),
  v.literal("PO"),
);

const languageValidator = v.union(
  v.literal("fr"),
  v.literal("en"),
  v.literal("jp"),
  v.literal("other"),
);

/** Champs éditables d'une entrée (hors quantité, gérée à part). */
const entryAttrs = {
  condition: v.optional(conditionValidator),
  language: v.optional(languageValidator),
  isHolo: v.optional(v.boolean()),
  isReverse: v.optional(v.boolean()),
  isFirstEdition: v.optional(v.boolean()),
  acquiredPriceEur: v.optional(v.number()),
  notes: v.optional(v.string()),
};

async function assertOwnsPokedex(
  ctx: QueryCtx,
  pokedexId: Id<"pokedexes">,
  userId: Id<"users">,
) {
  const pokedex = await ctx.db.get(pokedexId);
  if (pokedex === null || pokedex.userId !== userId) {
    throw new Error("Pokédex introuvable ou non autorisé");
  }
  return pokedex;
}

async function getOwnedEntry(
  ctx: MutationCtx,
  entryId: Id<"cardEntries">,
  userId: Id<"users">,
) {
  const entry = await ctx.db.get(entryId);
  if (entry === null || entry.userId !== userId) {
    throw new Error("Entrée introuvable ou non autorisée");
  }
  return entry;
}

/**
 * Ajoute une carte à un pokédex. Dédoublonnage : si la carte est déjà dans ce
 * pokédex, on incrémente la quantité au lieu de créer un doublon (index
 * by_pokedex_and_card).
 */
export const add = mutation({
  args: {
    pokedexId: v.id("pokedexes"),
    cardId: v.id("cards"),
    quantity: v.optional(v.number()),
    ...entryAttrs,
  },
  handler: async (ctx, { pokedexId, cardId, quantity, ...attrs }) => {
    const userId = await requireUserId(ctx);
    await assertOwnsPokedex(ctx, pokedexId, userId);

    const qty = quantity ?? 1;
    const existing = await ctx.db
      .query("cardEntries")
      .withIndex("by_pokedex_and_card", (q) =>
        q.eq("pokedexId", pokedexId).eq("cardId", cardId),
      )
      .first();

    if (existing !== null) {
      await ctx.db.patch(existing._id, { quantity: existing.quantity + qty });
      return existing._id;
    }

    return await ctx.db.insert("cardEntries", {
      pokedexId,
      userId,
      cardId,
      quantity: qty,
      ...attrs,
    });
  },
});

/** Édite une entrée possédée (quantité, état, langue, variantes…). */
export const update = mutation({
  args: {
    entryId: v.id("cardEntries"),
    quantity: v.optional(v.number()),
    ...entryAttrs,
  },
  handler: async (ctx, { entryId, ...patch }) => {
    const userId = await requireUserId(ctx);
    await getOwnedEntry(ctx, entryId, userId);
    await ctx.db.patch(entryId, patch);
  },
});

/** Supprime une entrée possédée. */
export const remove = mutation({
  args: { entryId: v.id("cardEntries") },
  handler: async (ctx, { entryId }) => {
    const userId = await requireUserId(ctx);
    await getOwnedEntry(ctx, entryId, userId);
    await ctx.db.delete(entryId);
  },
});

/**
 * Vue d'un pokédex : entrées jointes à leurs cartes + valeur totale estimée.
 * Anti-N+1 (PRD §8.1) : on dédoublonne les cardId puis on charge chaque carte
 * distincte une seule fois (point-lookup), sans scan par entrée.
 */
export const pokedexView = query({
  args: { pokedexId: v.id("pokedexes") },
  handler: async (ctx, { pokedexId }) => {
    const userId = await currentUserId(ctx);
    if (userId === null) return null;
    const pokedex = await ctx.db.get(pokedexId);
    if (pokedex === null || pokedex.userId !== userId) return null;

    const entries = await ctx.db
      .query("cardEntries")
      .withIndex("by_pokedex", (q) => q.eq("pokedexId", pokedexId))
      .collect();

    const ids = uniqueCardIds(entries);
    const cards = await Promise.all(ids.map((id) => ctx.db.get(id)));
    const cardById = new Map<Id<"cards">, NonNullable<(typeof cards)[number]>>();
    for (const c of cards) {
      if (c !== null) cardById.set(c._id, c);
    }

    const items = entries.map((e) => {
      const card = cardById.get(e.cardId) ?? null;
      return { entry: e, card };
    });

    const valuation = computeTotalValue(
      items.map(({ entry, card }) => ({
        quantity: entry.quantity,
        estimate: cardEstimateEur(card?.prices),
      })),
    );

    return {
      pokedex,
      items,
      ...valuation,
      lastPriceUpdate: Math.max(
        0,
        ...items.map(({ card }) => card?.prices?.updatedAt ?? 0),
      ),
    };
  },
});
