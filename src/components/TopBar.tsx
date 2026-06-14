import { Link } from '@tanstack/react-router'
import { Search, Camera } from 'lucide-react'
import { useScan } from '../lib/scan-context'
import { ProfileMenu } from './ProfileMenu'

/** Barre supérieure persistante façon Pinterest : grosse pilule de recherche
 *  + icône objectif (= scan). */
export function TopBar() {
  const { openScan } = useScan()
  return (
    <header className="sticky top-0 z-30 bg-white/92 backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <Link
          to="/"
          aria-label="Accueil"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-rouge font-display text-xl font-extrabold text-white"
        >
          P
        </Link>

        <div className="flex h-11 flex-1 items-center rounded-full bg-secondary pl-4 pr-1 transition focus-within:bg-muted">
          <Search className="size-5 shrink-0 text-gray" />
          <Link
            to="/search"
            className="flex-1 truncate px-3 text-[15px] text-gray"
          >
            Rechercher une carte
          </Link>
          <button
            onClick={openScan}
            aria-label="Scanner une carte"
            className="grid size-9 shrink-0 place-items-center rounded-full text-ink transition hover:bg-white"
          >
            <Camera className="size-5" />
          </button>
        </div>

        <ProfileMenu />
      </div>
    </header>
  )
}
