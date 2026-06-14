import { Link } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { Home, Search, Library, ScanLine, LogOut } from 'lucide-react'
import { useScan } from '../lib/scan-context'

const link =
  'grid size-12 place-items-center rounded-full text-ink transition hover:bg-secondary'
const activeProps = { className: 'bg-ink text-white hover:bg-ink' }

/** Rail d'icônes vertical (desktop ≥ lg), façon Pinterest. */
export function LeftRail() {
  const { openScan } = useScan()
  const { signOut } = useAuthActions()
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col items-center border-r border-border bg-white py-4 lg:flex">
      <div className="grid size-11 place-items-center rounded-full bg-rouge font-display text-xl font-extrabold text-white">
        P
      </div>
      <nav className="mt-6 flex flex-1 flex-col items-center gap-2">
        <Link to="/" className={link} activeOptions={{ exact: true }} activeProps={activeProps} aria-label="Collection">
          <Home className="size-6" />
        </Link>
        <Link to="/search" className={link} activeProps={activeProps} aria-label="Recherche">
          <Search className="size-6" />
        </Link>
        <Link to="/pokedexes" className={link} activeProps={activeProps} aria-label="Classeurs">
          <Library className="size-6" />
        </Link>
        <button
          onClick={openScan}
          className="mt-1 grid size-12 place-items-center rounded-full bg-rouge text-white shadow-lg shadow-rouge/30 transition hover:bg-rouge-deep"
          aria-label="Scanner"
        >
          <ScanLine className="size-6" />
        </button>
      </nav>
      <button onClick={() => void signOut()} className={link} aria-label="Déconnexion">
        <LogOut className="size-5" />
      </button>
    </aside>
  )
}
