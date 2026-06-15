import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Stockage des empreintes perceptuelles du catalogue (séparé de l'action de
// calcul). Le calcul parcourt les cartes par curseur (une passe unique).

export const needPage = internalQuery({
  args: { cursor: v.union(v.string(), v.null()), numItems: v.number() },
  handler: async (ctx, { cursor, numItems }) => {
    const page = await ctx.db.query("cards").paginate({ cursor, numItems });
    return {
      items: page.page
        .filter((c) => c.phash === undefined && c.imageUrl !== undefined)
        .map((c) => ({ id: c._id, imageUrl: c.imageUrl as string })),
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

export const setPhash = internalMutation({
  args: { cardId: v.id("cards"), phash: v.string() },
  handler: async (ctx, { cardId, phash }) => {
    await ctx.db.patch(cardId, { phash });
  },
});
