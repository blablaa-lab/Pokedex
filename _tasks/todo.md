# TODO — PokéDex Scanner (boucle phasée à portes)

## Itération 0 — Porte bloquante prix
- [x] Sonder la couverture prix TCGdex (échantillon récent + ancien)
- [x] Consigner le verdict A/B dans `DECISIONS.md`
- [x] **Verdict = CAS A** (TCGdex source unique, pas de bridge)
- [ ] ⛔ **STOP — attente validation utilisateur du verdict avant de poursuivre**

## Phase A — MVP sans scan (après validation)
- [x] **P1 — Scaffold** : TanStack Start + Convex + Convex Auth + Tailwind/shadcn + Vitest/convex-test câblés. Maturité Convex Auth vérifiée (pré-1.0, on continue). 4 portes vertes (typecheck/test/build/lint). ⚠️ `npx convex dev` (login) requis pour provisionner le déploiement.
- [x] **P2 — Données & provider** : `cardProvider` (interface stable + impl TCGdex), mapping pur testé (15 tests). Seed exécuté sur le cloud : **192 sets, 23 409 cartes** (identité FR+EN, `searchText` bilingue, image FR ; prix non seedés). Données vérifiées (base1-4 = Dracaufeu/Charizard).
- [x] **P3 — Pokédex CRUD** : `pokedexes` (list/get/create/rename/remove) filtré par `userId` auth, helper `authz`, cascade suppression entrées. 3 tests de sécurité (isolation user, déconnecté, cascade) + 18 tests verts.
- [x] **P4 — Recherche** : `cards.search` sur index `search_text` (FR ET EN), filtre set + numéro `localId`. 4 tests (bilingue, filtre set, numéro, sans critère) + smoke sur corpus réel (23k) OK.
- [x] **P5 — Fiche + entrées (backend)** : `cardEntries` add/update/remove + dédoublonnage, `pokedexView` (jointure batchée anti-N+1 + valeur totale). Modèle de valeur pur testé. Tests sécurité + valeur.
- [x] **P6 — Prix (backend)** : `prices.refreshCards` (batché, via cardProvider), 3 déclencheurs câblés (ajout planifié, cron quotidien stale+référencé, bouton `refreshPokedex` garde <6h). Sélection cron + garde testées.
- [x] **Frontend Phase A** : auth (SignInForm + gating), accueil (CRUD pokédex), recherche bilingue + filtres, dialogue d'ajout (qté/état/langue/variantes), vue pokédex (grille, valeur totale, refresh prix), toasts Sonner. SSR boote (HTTP 200), 4 portes vertes.
- [x] ✅ **Définition de « fonctionnel » §10 — VALIDÉE** contre le cloud, utilisateur authentifié réel (script E2E) : inscription/connexion, 2 pokédex, « Charizard »=« Dracaufeu »=base1-4, recherche set+numéro, ajout, **prix EUR + valeur totale (687,36 €)**, garde refresh <6h. 41 tests unitaires + 8/8 critères §10. Clés auth posées sur `proficient-salamander-160`.
- [x] Bug corrigé par la validation live : `lastPriceUpdate`/`prices.updatedAt` = instant du fetch (et non la date de marché TCGdex) → gardes cron 24h / bouton 6h correctes.

**→ Boucle Phase A CLÔTURÉE. Phase B (scan) hors boucle autonome — validation manuelle requise (vraies cartes).**

## Phase B — Scan (HORS boucle autonome, validation manuelle)
- [ ] Interface `scanCard(image) → candidats` + page de debug. Marqué « à valider manuellement ».
