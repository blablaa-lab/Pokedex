import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { currentUserId, requireUserId } from "./authz";

// ─────────────────────────────────────────────────────────────────────────
// POKÉDEX — CRUD multi-pokédex par user. Chaque opération est filtrée /
// vérifiée par le userId de l'auth (isolation testée dans pokedexes.test.ts).
// ─────────────────────────────────────────────────────────────────────────

/** Charge un pokédex en exigeant qu'il appartienne à `userId`. */
async function getOwnedPokedex(
  ctx: MutationCtx,
  pokedexId: Id<"pokedexes">,
  userId: Id<"users">,
) {
  const pokedex = await ctx.db.get(pokedexId);
  if (pokedex === null || pokedex.userId !== userId) {
    throw new Error("Pokédex introuvable ou non autorisé");
  }
  return pokedex;
}

/** Liste les pokédex du user courant. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await currentUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("pokedexes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/** Récupère un pokédex (uniquement le sien). */
export const get = query({
  args: { pokedexId: v.id("pokedexes") },
  handler: async (ctx, { pokedexId }) => {
    const userId = await currentUserId(ctx);
    if (userId === null) return null;
    const pokedex = await ctx.db.get(pokedexId);
    if (pokedex === null || pokedex.userId !== userId) return null;
    return pokedex;
  },
});

/** Crée un pokédex pour le user courant. */
export const create = mutation({
  args: { name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, { name, description }) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.insert("pokedexes", { userId, name, description });
  },
});

/** Renomme un pokédex possédé. */
export const rename = mutation({
  args: { pokedexId: v.id("pokedexes"), name: v.string() },
  handler: async (ctx, { pokedexId, name }) => {
    const userId = await requireUserId(ctx);
    await getOwnedPokedex(ctx, pokedexId, userId);
    await ctx.db.patch(pokedexId, { name });
  },
});

/** Supprime un pokédex possédé (cascade : ses entrées de collection). */
export const remove = mutation({
  args: { pokedexId: v.id("pokedexes") },
  handler: async (ctx, { pokedexId }) => {
    const userId = await requireUserId(ctx);
    await getOwnedPokedex(ctx, pokedexId, userId);
    const entries = await ctx.db
      .query("cardEntries")
      .withIndex("by_pokedex", (q) => q.eq("pokedexId", pokedexId))
      .collect();
    for (const e of entries) await ctx.db.delete(e._id);
    await ctx.db.delete(pokedexId);
  },
});
