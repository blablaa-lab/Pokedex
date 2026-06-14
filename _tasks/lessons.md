# Leçons — patterns à ne pas réapprendre

## convex-test + Vite 8

- **Le glob des modules doit inclure `_generated/` et exclure les tests.** L'extglob `import.meta.glob("./**/!(*.*.*)*.*s")` (doc convex-test) **n'est pas géré** par le moteur de glob de Vite 8 → `_generated` non inclus → erreur « Could not find the "_generated" directory ». Utiliser la **forme tableau avec négations** :
  ```ts
  const modules = import.meta.glob(["./**/*.*s", "!./**/*.test.*", "!./**/*.d.ts"]);
  ```
- **`import.meta.glob` casse le typecheck Convex** (le `convex/tsconfig.json` n'a pas les types Vite). Ne PAS exclure les `*.test.ts` du tsconfig Convex (sinon ESLint typé les déclare orphelins). À la place, ajouter `"vite/client"` aux `types` du `convex/tsconfig.json`. Convex ne bundle pas les `*.test.ts`, donc c'est sans risque.
- **Auth dans convex-test** : `t.withIdentity({ subject: userId })` ; `getAuthUserId` fait `subject.split("|")[0]`, donc passer l'`Id<"users">` brut suffit.

## Convex Cloud / déploiement

- **Deploy key dev** (`CONVEX_DEPLOY_KEY`) court-circuite le login CLI global, mais **ne peut pas déclencher d'`internalAction` via `npx convex run`** (`RunInternalActions` refusé) → exposer une action publique de maintenance (à sécuriser avant prod).
- Toujours vérifier la **team** ciblée avant `convex dev --configure new` : le CLI crée sur le compte logué, pas forcément le bon.

## ESLint (config tanstack, lint typé)

- Ignorer les fichiers générés/build : `.output/`, `.nitro/`, `dist/`, `convex/_generated/`.
- Style imposé : imports `type` en top-level (pas inline), signatures de méthode en propriété-fonction (`fn: () => T`), pas de directive `eslint-disable` inutile.
