import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { TcgdexProvider } from "./providers/tcgdex";
import { chunk } from "./model/prices";

// ─────────────────────────────────────────────────────────────────────────
// SETS — liste pour les filtres (Collection / Année) + enrichissement des
// dates de sortie (depuis l'API TCGdex, via le cardProvider).
// ─────────────────────────────────────────────────────────────────────────

function yearOf(releaseDate?: string): number | undefined {
  if (!releaseDate) return undefined;
  const y = Number(releaseDate.slice(0, 4));
  return Number.isFinite(y) ? y : undefined;
}

/** Liste des sets (pour les menus de filtre) : nom, année, nb de cartes. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const sets = await ctx.db.query("sets").collect();
    return sets
      .map((s) => ({
        tcgdexId: s.tcgdexId,
        name: s.name,
        year: yearOf(s.releaseDate),
        cardCount: s.cardCount,
      }))
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.name.localeCompare(b.name));
  },
});

export const forEnrich = internalQuery({
  args: {},
  handler: async (ctx) => {
    const sets = await ctx.db.query("sets").collect();
    return sets.map((s) => ({
      _id: s._id,
      tcgdexId: s.tcgdexId,
      releaseDate: s.releaseDate,
    }));
  },
});

export const patchDate = internalMutation({
  args: { setId: v.id("sets"), releaseDate: v.string() },
  handler: async (ctx, { setId, releaseDate }) => {
    await ctx.db.patch(setId, { releaseDate });
  },
});

/** Enrichit les sets avec leur date de sortie (à lancer une fois). */
export const enrichDates = action({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }): Promise<{ updated: number }> => {
    const sets = await ctx.runQuery(internal.sets.forEnrich);
    const todo = force ? sets : sets.filter((s) => !s.releaseDate);
    const provider = new TcgdexProvider();
    let updated = 0;
    for (const batch of chunk(todo, 8)) {
      const dates = await Promise.all(
        batch.map((s) => provider.fetchSetReleaseDate(s.tcgdexId).catch(() => null)),
      );
      await Promise.all(
        dates.map((d, i) => {
          if (!d) return undefined;
          updated += 1;
          return ctx.runMutation(internal.sets.patchDate, {
            setId: batch[i]._id,
            releaseDate: d,
          });
        }),
      );
    }
    return { updated };
  },
});
