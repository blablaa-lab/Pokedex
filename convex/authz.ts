import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Helpers de sécurité. Règle PRD §3 : toute query/mutation filtre sur le
// userId issu de l'auth ; un user ne lit/écrit jamais les données d'un autre.

/** userId courant ou null (lectures publiques-par-user tolérant le déconnecté). */
export async function currentUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  return await getAuthUserId(ctx);
}

/** userId courant, sinon lève (mutations : auth obligatoire). */
export async function requireUserId(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Non authentifié");
  }
  return userId;
}
