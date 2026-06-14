import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'

import ConvexProvider from '../integrations/convex/provider'
import { AppHeader } from '../components/AppHeader'
import { SignInForm } from '../components/SignInForm'
import { Toaster } from '../components/ui/sonner'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
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
          <AuthLoading>
            <div className="grid min-h-screen place-items-center text-muted-foreground">
              Chargement…
            </div>
          </AuthLoading>
          <Unauthenticated>
            <SignInForm />
          </Unauthenticated>
          <Authenticated>
            <AppHeader />
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          </Authenticated>

          <Toaster richColors position="top-right" />
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        </ConvexProvider>
        <Scripts />
      </body>
    </html>
  )
}
