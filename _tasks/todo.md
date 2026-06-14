# TODO — PokéDex Scanner (boucle phasée à portes)

## Itération 0 — Porte bloquante prix
- [x] Sonder la couverture prix TCGdex (échantillon récent + ancien)
- [x] Consigner le verdict A/B dans `DECISIONS.md`
- [x] **Verdict = CAS A** (TCGdex source unique, pas de bridge)
- [ ] ⛔ **STOP — attente validation utilisateur du verdict avant de poursuivre**

## Phase A — MVP sans scan (après validation)
- [x] **P1 — Scaffold** : TanStack Start + Convex + Convex Auth + Tailwind/shadcn + Vitest/convex-test câblés. Maturité Convex Auth vérifiée (pré-1.0, on continue). 4 portes vertes (typecheck/test/build/lint). ⚠️ `npx convex dev` (login) requis pour provisionner le déploiement.
- [ ] **P2 — Données & provider** : `schema.ts` en place, `cardProvider` (interface stable, TCGdex source unique), seed script `cards`+`sets` (FR+EN, `searchText`).
- [ ] **P3 — Pokédex CRUD** : multi-pokédex/user + tests de sécurité (isolation par `userId`).
- [ ] **P4 — Recherche** : index `search_text`, match FR ET EN, filtre set + `localId`. Test « Charizard »=« Dracaufeu ».
- [ ] **P5 — Fiche + entrées** : ajout/édition (quantité, état, langue, variantes), fiche carte avec prix.
- [ ] **P6 — Prix** : `refreshPrices` (action), 3 déclencheurs, vue valeur totale, toasts Sonner.
- [ ] Atteindre la Définition de « fonctionnel » (PRD §10) → rapport, fin de boucle Phase A.

## Phase B — Scan (HORS boucle autonome, validation manuelle)
- [ ] Interface `scanCard(image) → candidats` + page de debug. Marqué « à valider manuellement ».
