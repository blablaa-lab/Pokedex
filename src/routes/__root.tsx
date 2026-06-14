import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'

import ConvexProvider from '../integrations/convex/provider'
import { ScanProvider } from '../lib/scan-context'
import { TopBar } from '../components/TopBar'
import { LeftRail } from '../components/LeftRail'
import { BottomNav } from '../components/BottomNav'
import { ScanModal } from '../components/ScanModal'
import { SignInForm } from '../components/SignInForm'
import { Toaster } from '../components/ui/sonner'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'PokéDex Scanner' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        <ConvexProvider>
          <ScanProvider>
            <AuthLoading>
              <div className="grid min-h-screen place-items-center text-muted-foreground">
                Chargement…
              </div>
            </AuthLoading>
            <Unauthenticated>
              <SignInForm />
            </Unauthenticated>
            <Authenticated>
              <LeftRail />
              <div className="lg:pl-20">
                <TopBar />
                <main className="mx-auto max-w-[1500px] px-3 pb-28 pt-3 sm:px-5 lg:pb-10">
                  {children}
                </main>
              </div>
              <BottomNav />
              <ScanModal />
            </Authenticated>

            <Toaster richColors position="top-center" />
          </ScanProvider>
        </ConvexProvider>
        <Scripts />
      </body>
    </html>
  )
}
