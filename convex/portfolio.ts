import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { currentUserId, requireUserId } from "./authz";

// ─────────────────────────────────────────────────────────────────────────
// Historique de valeur du portefeuille (par pokédex), pour le graphe d'évolution.
// ─────────────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;

/** Valeur totale courante d'un pokédex (toutes langues), depuis les prix cachés. */
async function computeTotal(ctx: MutationCtx, pokedexId: Id<"pokedexes">): Promise<number> {
  const entries = await ctx.db
    .query("cardEntries")
    .withIndex("by_pokedex", (q) => q.eq("pokedexId", pokedexId))
    .collect();
  let total = 0;
  for (const e of entries) {
    const card = await ctx.db.get(e.cardId);
    const p = card?.prices;
    const est = p?.eurAvg30 ?? p?.eurTrend ?? p?.eurLow ?? null;
    if (est !== null) total += est * e.quantity;
  }
  return total;
}

/** Enregistre (ou met à jour) le snapshot du jour pour ce pokédex. */
export const recordSnapshot = mutation({
  args: { pokedexId: v.id("pokedexes") },
  handler: async (ctx, { pokedexId }) => {
    const userId = await requireUserId(ctx);
    const pokedex = await ctx.db.get(pokedexId);
    if (pokedex === null || pokedex.userId !== userId) return;

    const total = await computeTotal(ctx, pokedexId);
    const now = Date.now();
    const dayStart = Math.floor(now / DAY) * DAY;

    const recent = await ctx.db
      .query("valueSnapshots")
      .withIndex("by_pokedex", (q) => q.eq("pokedexId", pokedexId))
      .order("desc")
      .first();

    if (recent && recent.at >= dayStart) {
      await ctx.db.patch(recent._id, { totalEur: total, at: now });
    } else {
      await ctx.db.insert("valueSnapshots", { userId, pokedexId, at: now, totalEur: total });
    }
  },
});

/** Historique (60 derniers points) du pokédex, le plus ancien d'abord. */
export const history = query({
  args: { pokedexId: v.id("pokedexes") },
  handler: async (ctx, { pokedexId }) => {
    const userId = await currentUserId(ctx);
    if (userId === null) return [];
    const pokedex = await ctx.db.get(pokedexId);
    if (pokedex === null || pokedex.userId !== userId) return [];
    const snaps = await ctx.db
      .query("valueSnapshots")
      .withIndex("by_pokedex", (q) => q.eq("pokedexId", pokedexId))
      .order("desc")
      .take(60);
    return snaps.reverse().map((s) => ({ at: s.at, totalEur: s.totalEur }));
  },
});
