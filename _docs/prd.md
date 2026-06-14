# PRD — PokéDex Scanner

> Webapp de gestion de collection de cartes Pokémon : comptes utilisateurs, pokédex multiples (catalogues), recherche FR/EN, prix EUR, et scan de carte (caméra/photo) avec confirmation humaine.

---

## 1. Contexte & objectif

Application personnelle / petit collectionneur, **audience francophone**. L'utilisateur veut :

- cataloguer sa collection dans un ou plusieurs « pokédex » ;
- retrouver le **visuel** d'une carte et son **prix de marché en EUR** ;
- chercher une carte **manuellement** (nom FR, nom EN, numéro de collecteur, set) ;
- **scanner** une carte physique (webcam / appareil photo) pour l'ajouter.

Ce n'est **pas** un outil de revente / valorisation temps réel : les prix sont des agrégats indicatifs.

---

## 2. Stack & décisions arrêtées

| Domaine | Choix | Raison |
|---|---|---|
| Framework | **TanStack Start** | demandé. SSR derrière login (apport modeste, assumé) |
| Backend / DB | **Convex** | demandé. Réactif, file storage + cron + search intégrés |
| Auth | **Convex Auth** | tout dans Convex, zéro SaaS tiers. *À vérifier : maturité.* |
| UI | **shadcn/ui + Tailwind** | demandé |
| Source identité (noms/visuels/sets FR) | **TCGdex** | FR natif, multilingue, open source, sans clé |
| Source prix EUR | **TCGdex si suffisant, sinon bridge `cardmarket` de pokemontcg.io** | à trancher en itération 0 (cf. §9) |
| Notifications UI | **Sonner (toasts)** | retour visuel des refresh |

**Abstraction obligatoire** : tous les accès aux sources externes passent par un module `cardProvider` (interface stable). On doit pouvoir dégrader « TCGdex + bridge prix » en source unique sans réécrire le reste. Les API TCG bougent (rachats, accès en flux) → cette couche est non négociable.

---

## 3. Modèle de données

Voir `schema.ts`. Principe directeur :

- **`cards`** = catalogue partagé, **seedé en masse** depuis TCGdex (identité quasi statique : noms FR+EN, numéro, set, visuel). La recherche tourne **en local** sur cette table → instantanée, bilingue, sans rate limit.
- **`prices`** sur `cards` = volatil, **jamais seedé**, rempli paresseusement et rafraîchi (cf. §6).
- **`cardEntries`** = la carte possédée dans un pokédex, qui **référence** `cards` (cache une fois, référencé partout).
- **`sets`** porte aussi la table de correspondance `ptcgioId` pour le bridge prix.

Règle de sécurité : toute query/mutation filtre sur `userId` issu de l'auth. Un user ne lit/écrit jamais les pokédex d'un autre.

---

## 4. Périmètre fonctionnel par phase

### Phase A — MVP sans scan (cœur du produit)

1. **Auth** : inscription / connexion (Convex Auth, email+mot de passe au minimum).
2. **Pokédex CRUD** : créer / renommer / supprimer plusieurs pokédex par user.
3. **Recherche manuelle** :
   - champ texte unique → match **nom FR ou nom EN** (index `search_text`) ;
   - filtres : set, et recherche par **numéro de collecteur** (`localId`) ;
   - résultats en grille avec visuel + nom FR (+ nom EN en secondaire).
4. **Fiche carte** : visuel FR, noms FR/EN, set, numéro, rareté, prix EUR (+ date de mise à jour), bouton « ajouter à un pokédex ».
5. **Ajout / édition d'entrée** : quantité, état (échelle Cardmarket), langue physique, variantes (holo/reverse/1re édition), prix payé, notes.
6. **Vue pokédex** : grille des cartes possédées, **valeur totale estimée**, indicateur « tarifs à jour il y a X ».
7. **Refresh prix** : bouton manuel + cron quotidien (cf. §6).

### Phase B — Scan (chantier à part, human-in-the-loop, cf. §7)

8. Capture caméra (`getUserMedia`) / upload photo.
9. OCR ciblé sur le **numéro de collecteur** → requête catalogue → **1 à 3 candidats** affichés → **confirmation par l'utilisateur** → ajout.
10. Stockage de la photo de scan (`capturedImageId`, Convex file storage).

### Phase C — Robustesse scan (plus tard)

11. **Perceptual hashing** (pHash) : match visuel indépendant de l'OCR. Combo : OCR réduit au set → pHash départage.

---

## 5. Non-objectifs (cadrage explicite — NE PAS faire)

- ❌ Pas de scan **100 % automatique** : il y a **toujours** une confirmation humaine.
- ❌ Pas de prix temps réel / API Cardmarket commerciale (OAuth verrouillé).
- ❌ Pas de paiement, marketplace, ou échange entre users.
- ❌ Pas de pHash en phase A/B.
- ❌ Pas de support multi-jeux (uniquement Pokémon).
- ❌ Pas d'app mobile native (web responsive uniquement).

---

## 6. Stratégie de prix (3 déclencheurs, une seule action)

Une action Convex unique `refreshPrices(cardIds)` (via le `cardProvider`), déclenchée par :

1. **À l'ajout** d'une carte à un pokédex (sinon prix vide).
2. **Cron quotidien** : `by_stale_price` → ne rafraîchit **que** les cartes **référencées par au moins une entrée ET** `lastPriceUpdate > 24h`. Borne la conso d'API.
3. **Bouton manuel** : scopé au pokédex courant, avec garde « pas de refetch si `< 6h` ».

Contraintes : appels externes **uniquement dans des actions** (jamais côté client → fuite de clé, pas de cache). Batching + respect du rate limit du provider.

---

## 7. Le point dur : le scan

C'est la partie **la plus risquée et la moins déterministe**. Décisions :

- **OCR sur le numéro, pas sur le nom.** `025/165` est quasi une clé unique ; des « Pikachu » il y en a 200. Le numéro étant numérique, **aucun OCR de français** à gérer.
- Pipeline : capture → crop bas de carte → OCR (regex `\d+/\d+` ou `\d+` + code set) → requête `localId` + `setId` → candidats → **confirmation**.
- Implémentation : **Tesseract.js** (navigateur, gratuit) en premier ; **Google Vision** en repli si l'accuracy est insuffisante.
- ⚠️ **La qualité du scan ne se valide PAS par des tests unitaires.** Elle dépend de vraies cartes, vrais reflets holo, vrai éclairage. Le scan se valide **à la main**, pas dans la boucle autonome (cf. prompt Claude Code).

---

## 8. Stratégie de tests

### Tests unitaires / intégration (`convex-test` + Vitest) — *à vérifier : API actuelle*

Couvrir la **logique métier**, pas le framework :

- normalisation des résultats du `cardProvider` (mapping TCGdex → modèle interne, merge prix bridge) ;
- construction du `searchText` et match FR **et** EN sur un corpus seedé d'échantillon ;
- sécurité : un user ne peut lire/modifier que **ses** pokédex/entrées ;
- calcul de la **valeur totale** d'un pokédex (quantités × prix, entrées sans prix) ;
- logique de dédoublonnage d'entrée (`by_pokedex_and_card`).

### « Tests de performance » — les 3 invariants qui comptent vraiment ici

Pas de load test synthétique (k6, etc.) : hors d'échelle pour ce produit. À la place, **asserter ces invariants** :

1. **Pas de N+1** dans la vue pokédex : lister N entrées + leurs cartes ne doit pas faire N lookups séparés (batch via les ids).
2. **Refresh borné** : `refreshPrices` batche et respecte le rate limit ; le cron ne sélectionne **que** stale + référencé (assert sur la query de sélection).
3. **Recherche** : smoke test que l'index `search_text` répond sur le corpus seedé (sanity, pas benchmark).

---

## 9. Risques & inconnue à lever en premier

| Risque | Mitigation |
|---|---|
| **Couverture prix TCGdex inconnue** | **Itération 0** : le seed script sonde les prix sur un échantillon et **logge le verdict** → décide source unique vs bridge. Rien en aval ne se construit avant. |
| API TCG instables / accès en flux | abstraction `cardProvider` |
| Maturité de Convex Auth | vérifier au scaffold ; repli Clerk documenté si bloquant |
| Scan peu fiable | human-in-the-loop + pHash en phase C |
| Conso d'API non bornée | cron filtré + garde anti-spam sur le bouton |

---

## 10. Définition de « fonctionnel » (critères d'acceptation = condition d'arrêt de la boucle)

La **Phase A** est terminée quand, sur une instance Convex réelle :

- [ ] un user peut s'inscrire, se connecter, se déconnecter ;
- [ ] il crée ≥ 2 pokédex distincts et ne voit pas ceux d'un autre user ;
- [ ] une recherche « Charizard » **et** « Dracaufeu » renvoient la même carte (visuel FR affiché) ;
- [ ] une recherche par numéro de collecteur fonctionne ;
- [ ] il ajoute une carte à un pokédex avec quantité/état/langue ;
- [ ] la fiche et la vue pokédex affichent un **prix EUR** et une **valeur totale** ;
- [ ] le bouton refresh et le cron mettent à jour les prix (toast de confirmation) ;
- [ ] tous les tests unitaires/intégration passent ; les 3 invariants perf sont assertés ;
- [ ] le verdict prix (itération 0) est consigné dans `DECISIONS.md`.

Le **scan (Phase B)** n'entre **pas** dans cette définition : il est livré avec un harnais de test manuel et validé séparément avec de vraies cartes.
