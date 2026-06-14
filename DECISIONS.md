# DECISIONS.md — PokéDex Scanner

Journal des choix non triviaux, inconnues levées et écarts au PRD. Une ligne par décision.

---

## Itération 0 — Verdict prix (PORTE BLOQUANTE) ✅

**Date du sondage : 2026-06-14. Source sondée : API TCGdex v2 (`https://api.tcgdex.net/v2/{lang}/cards/{id}`).**

### VERDICT : **CAS A — prix TCGdex suffisants. `cardProvider` = TCGdex en source unique. Pas de bridge pokemontcg.io.**

### Preuves (échantillon récent + ancien)

L'API TCGdex expose un bloc `pricing.cardmarket` en **EUR** au niveau racine de la carte (et un détail par variante dans `variants_detailed`). Champs disponibles : `avg`, `low`, `trend`, `avg1`, `avg7`, `avg30`, `updated`, `unit:"EUR"`, `idProduct`. Mapping direct vers `schema.ts` :

| schema.ts (`cards.prices`) | champ TCGdex |
|---|---|
| `eurTrend` | `pricing.cardmarket.trend` |
| `eurAvg30` | `pricing.cardmarket.avg30` |
| `eurLow`   | `pricing.cardmarket.low` |
| `source`   | `"tcgdex"` |
| `updatedAt`| `pricing.cardmarket.updated` (→ epoch) |

**Couverture par époque (1 carte par ère, EN) — prix EUR présents et frais (updated 2026-06-13, J-1) :**

| Set / année | Carte | avg EUR | prix ? |
|---|---|---|---|
| Base Set 1999 | Charizard | 335.61 | ✅ |
| Jungle 1999 | Clefable | 25.06 | ✅ |
| Neo Genesis 2000 | Lugia | 294.12 | ✅ |
| EX Ruby&Sapphire 2003 | Aggron | 11.06 | ✅ |
| Diamond&Pearl 2007 | Dialga | 10.61 | ✅ |
| Black&White 2011 | Snivy | 0.15 | ✅ |
| XY 2014 | Venusaur EX | 6.78 | ✅ |
| Sun&Moon 2017 | Caterpie | 0.11 | ✅ |
| Sword&Shield 2020 | Celebi V | 2.28 | ✅ |
| Scarlet&Violet 2023 | Charizard ex (sv03-125) | 4.09 | ✅ |

**Taux de couverture sur sets entiers (échantillon 30 cartes/set) :**
- `base1` (Base Set, 1999) : **30/30** cartes avec prix EUR.
- `sv03` (Obsidian Flames, 2023) : **30/30** cartes avec prix EUR.

→ Couverture ≈ 100 % de l'ancien au récent. Aucun trou justifiant le bridge.

### Conséquences

- `cardProvider` implémente **une seule source** : TCGdex (identité **et** prix).
- `sets.ptcgioId` reste **nullable et non peuplé** (colonne conservée pour un éventuel bridge futur, conforme au schéma — pas de script de fuzzy-match à écrire pour l'instant).
- `refreshPrices` lira `pricing.cardmarket` depuis TCGdex (à construire en P6, après scaffold).
- Le seed peuple identité uniquement (noms FR+EN, set, localId, image, rareté) ; **les prix ne sont JAMAIS seedés** (PRD §3), remplis paresseusement via `refreshPrices`.

### Faux positif écarté

- `sv01-1` renvoie un **404** (id inexistant — le set Scarlet&Violet de base n'utilise pas ce format d'id) : ce n'était **pas** un trou de prix.

### Notes provider confirmées au sondage

- **id stable inter-langue** : `base1-4` identique en `/fr` et `/en` → pull bilingue par simple double-requête sur le même id.
- **Noms FR natifs** : `/fr/cards/base1-4` → "Dracaufeu" ; `/en/...` → "Charizard". `searchText = nameFr + " " + nameEn`.
- **Image FR** dispo (`assets.tcgdex.net/fr/...`), cohérente avec la carte en main (PRD §3).
- `pricing` est identique sur l'endpoint `/fr` et `/en` → on peut tirer prix + nom FR en une passe FR, et le nom EN en passe EN.
- API **sans clé**, pas de rate-limit documenté agressif — batching de courtoisie quand même côté `refreshPrices`.

---

## P1 — Scaffold ✅

**Date : 2026-06-14.** Scaffold via `create-start-app` (add-ons `convex` + `shadcn`), puis câblage manuel de Convex Auth + convex-test.

### Versions retenues (relevées sur le registre npm)
- TanStack Start 1.168 / Router 1.170 — stable.
- Vite **8** · Tailwind **4** · React 19 — récents mais le scaffold officiel les version-matche (config non écrite à la main).
- convex 1.41 · `@convex-dev/react-query` 0.1 (intégration Convex côté client).
- `@convex-dev/auth` **0.0.94** · convex-test **0.0.53** · `@edge-runtime/vm` 5.0.

### Maturité Convex Auth — verdict : **on continue, pas de bascule Clerk**
- `@convex-dev/auth` reste en **pré-1.0** (0.0.94) et tire une dépendance dépréciée (`lucia@3.2.2`). Risque noté.
- **Non bloquant pour P1** : le câblage (provider `ConvexAuthProvider`, `convex/auth.ts` provider Password, `convex/http.ts`, `convex/auth.config.ts`) est en place et compile. La validation runtime de l'auth (flux inscription/connexion) se fera en **P3** une fois le déploiement Convex provisionné.
- Repli Clerk documenté (PRD §9) si l'auth s'avère bloquante en P3 — **ne pas basculer sans accord explicite**.

### Frontière de P1 : le déploiement Convex nécessite le login utilisateur
- `convex codegen` et `convex dev` exigent un `CONVEX_DEPLOYMENT` → **action manuelle requise** : `npx convex dev` (login Convex), qui provisionne le déploiement, régénère `convex/_generated/` contre le schéma autoritaire, et renseigne `VITE_CONVEX_URL`/`CONVEX_DEPLOYMENT` dans `.env.local`.
- En attendant, `convex/_generated/` est celui du scaffold (démo) ; aucun code applicatif ne l'importe encore, donc typecheck/build/test restent verts. Il sera régénéré au premier `convex dev`.
- Le provider Convex est **tolérant à l'absence de `VITE_CONVEX_URL`** (rend les routes sans provider + warning) → pas de crash SSR au build/dev tant que le déploiement n'est pas configuré.

### Portes de sortie P1 — toutes vertes (offline, sans déploiement)
- `npm run typecheck` ✅ · `npm test` (smoke convex-test : insert + relecture d'une carte) ✅ · `npm run build` (SSR + client + Nitro) ✅ · `npm run lint` ✅.

### Déploiement Convex Cloud connecté (2026-06-14)
- Choix utilisateur : **nouveau projet dédié** `pokedex` (team `werocket-labs`) plutôt que réutiliser le projet existant « Clicc » → séparation propre, aucun risque pour Clicc.
- Déploiement dev cloud : `upbeat-lark-95` (eu-west-1). Lié via `convex dev --once --configure new` (CLI déjà authentifié).
- `.env.local` (gitignoré) : `CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`.
- `convex/_generated/` régénéré contre le schéma autoritaire ; schéma + fonctions auth **poussés et "ready"**.
- Correctif : `convex/tsconfig.json` → `types: ["node"]` (process.env dans `auth.config.ts`).
- **Reste pour P3** : initialiser les variables d'env de Convex Auth sur le déploiement (clés JWT / `SITE_URL`) via `npx @convex-dev/auth` avant de câbler le flux inscription/connexion runtime.

### Écarts / nettoyage
- Démo retirée : `convex/todos.ts` + tables `products`/`todos` du schéma (remplacé par le schéma autoritaire).
- `vitest.config.ts` dédié (n'hérite pas des plugins de `vite.config.ts`), environnement `edge-runtime` pour convex-test.
- ESLint ignore `.output/`, `.nitro/`, `dist/`, `convex/_generated/` (fichiers générés/build).
- Cache npm perso root-owned → installs via `--cache /tmp/npm-cache-pkdx`.
