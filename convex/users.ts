import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Profil de l'utilisateur courant (pour l'avatar / le menu). */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (user === null) return null;
    return { name: user.name, email: user.email, image: user.image };
  },
});
