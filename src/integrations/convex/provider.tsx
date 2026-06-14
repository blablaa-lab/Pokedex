import { ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL as string | undefined

// Le client n'est instancié que si l'URL Convex est présente : tant que
// `npx convex dev` n'a pas renseigné VITE_CONVEX_URL, l'app rend les routes
// sans provider (évite un crash SSR au build/dev). Câblage auth réel en P3.
const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null

export default function AppConvexProvider({
  children,
}: {
  children: React.ReactNode
}) {
  if (!convex) {
    if (typeof window !== 'undefined') {
      console.error(
        'VITE_CONVEX_URL manquant — lance `npx convex dev` puis renseigne .env.local',
      )
    }
    return <>{children}</>
  }

  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>
}
