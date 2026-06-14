import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

// Convex Auth — email + mot de passe (PRD §4.1, minimum requis).
// La logique d'UI (inscription/connexion/déconnexion) arrive en P3.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
