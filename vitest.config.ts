import { defineConfig } from 'vitest/config'

// Config Vitest dédiée (ne charge PAS les plugins de vite.config.ts :
// tanstackStart/nitro n'ont rien à faire dans les tests de logique métier).
// `edge-runtime` est l'environnement requis par convex-test pour exécuter
// les fonctions Convex en process, sans déploiement.
export default defineConfig({
  test: {
    environment: 'edge-runtime',
    server: {
      deps: {
        inline: ['convex-test'],
      },
    },
    include: ['convex/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
  },
})
