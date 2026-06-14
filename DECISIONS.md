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

## Stack & maturité (à confirmer en P1)

- _En attente du scaffold P1 : vérifier la maturité de Convex Auth (repli Clerk documenté si bloquant, PRD §9) avant de poursuivre._
