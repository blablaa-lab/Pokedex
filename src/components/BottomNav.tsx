import { Link } from '@tanstack/react-router'
import { Home, Search, ScanLine, Library } from 'lucide-react'
import { useScan } from '../lib/scan-context'

const item = 'grid flex-1 place-items-center py-2.5 text-ink/55 transition-colors'
const activeProps = { className: 'text-ink' }

/** Navigation basse (mobile < lg), épurée façon Pinterest. */
export function BottomNav() {
  const { openScan } = useScan()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 backdrop-blur-md lg:hidden">
      <div className="flex items-center px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <Link to="/" className={item} activeOptions={{ exact: true }} activeProps={activeProps} aria-label="Collection">
          <Home className="size-6" />
        </Link>
        <Link to="/search" className={item} activeProps={activeProps} aria-label="Recherche">
          <Search className="size-6" />
        </Link>
        <button onClick={openScan} className="grid flex-1 place-items-center" aria-label="Scanner">
          <span className="-mt-5 grid size-14 place-items-center rounded-full bg-rouge text-white shadow-lg shadow-rouge/30 ring-4 ring-white transition active:scale-95">
            <ScanLine className="size-6" />
          </span>
        </button>
        <Link to="/pokedexes" className={item} activeProps={activeProps} aria-label="Classeurs">
          <Library className="size-6" />
        </Link>
        <span className={item} aria-hidden />
      </div>
    </nav>
  )
}
