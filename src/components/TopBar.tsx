import { SearchBox } from './SearchBox'
import { ProfileMenu } from './ProfileMenu'

/** Barre supérieure persistante façon Pinterest : recherche avec
 *  autocomplétion + icône scan, et menu profil à droite. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 bg-white/92 backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <SearchBox />
        <ProfileMenu />
      </div>
    </header>
  )
}
