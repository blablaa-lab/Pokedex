# PokéDex Scanner

Webapp de gestion de collection de cartes Pokémon : comptes utilisateurs, pokédex multiples, recherche FR/EN, prix EUR, et scan de carte (phase ultérieure). Audience francophone.

Specs de référence : [`_docs/prd.md`](_docs/prd.md) (produit) et [`_docs/schema.ts`](_docs/schema.ts) (modèle de données, fait autorité). Journal des décisions : [`DECISIONS.md`](DECISIONS.md).

## Stack

TanStack Start · Convex · Convex Auth (email + mot de passe) · Tailwind v4 + shadcn/ui · Vitest + convex-test.

## Démarrage

```bash
# 1. Dépendances (cache alternatif : voir note ci-dessous)
npm install

# 2. Provisionner le déploiement Convex (login requis — crée .env.local,
#    régénère convex/_generated/, renseigne VITE_CONVEX_URL)
npx convex dev

# 3. Front (autre terminal)
npm run dev   # http://localhost:3000
```

> ℹ️ Si `npm install` échoue sur un `EACCES` du cache (`~/.npm` root-owned),
> utilise un cache alternatif : `npm install --cache /tmp/npm-cache-pkdx`.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de dev TanStack Start (port 3000) |
| `npm run convex:dev` | déploiement Convex en dev (login requis) |
| `npm test` | tests de logique métier (Vitest + convex-test) |
| `npm run typecheck` | vérification TypeScript |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run build` | build de production |

## État

- ✅ **Itération 0** — verdict prix : CAS A (TCGdex source unique). Cf. `DECISIONS.md`.
- ✅ **P1** — scaffold câblé, 4 portes vertes (typecheck/test/build/lint).
- ⏳ P2–P6 — données & provider, CRUD pokédex, recherche bilingue, fiches/entrées, prix. Cf. `_tasks/todo.md`.
