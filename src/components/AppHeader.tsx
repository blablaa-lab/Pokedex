import { Link } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { Button } from './ui/button'

export function AppHeader() {
  const { signOut } = useAuthActions()
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-4">
          <Link to="/" className="font-bold">
            PokéDex Scanner
          </Link>
          <Link
            to="/search"
            className="text-sm text-muted-foreground [&.active]:text-foreground"
          >
            Recherche
          </Link>
        </nav>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          Déconnexion
        </Button>
      </div>
    </header>
  )
}
