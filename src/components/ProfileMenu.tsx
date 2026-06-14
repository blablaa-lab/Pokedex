import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { ChevronDown, Library, LogOut } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

function initials(name?: string, email?: string): string {
  const src = name?.trim() || email?.split('@')[0] || '?'
  const parts = src.split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || src[0].toUpperCase()
}

/** Bouton profil (avatar + chevron) à droite de la recherche, façon Pinterest,
 *  avec déconnexion en dropdown. */
export function ProfileMenu() {
  const viewer = useQuery(api.users.viewer)
  const { signOut } = useAuthActions()
  const label = viewer?.name || viewer?.email || 'Mon compte'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex shrink-0 items-center gap-1 rounded-full p-0.5 outline-none transition hover:bg-secondary">
        <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-rouge to-rouge-deep text-sm font-bold text-white ring-1 ring-black/5">
          {viewer?.image ? (
            <img src={viewer.image} alt="" className="size-full object-cover" />
          ) : (
            initials(viewer?.name, viewer?.email)
          )}
        </span>
        <ChevronDown className="size-4 text-gray transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-60 rounded-2xl border-border p-1.5 shadow-xl"
      >
        <DropdownMenuLabel className="px-2.5 py-2">
          <div className="truncate text-sm font-semibold">{label}</div>
          {viewer?.email && (
            <div className="truncate text-xs font-normal text-muted-foreground">
              {viewer.email}
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer rounded-xl px-2.5 py-2">
          <Link to="/pokedexes">
            <Library className="size-4" /> Mes classeurs
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => void signOut()}
          className="cursor-pointer rounded-xl px-2.5 py-2 text-rouge focus:bg-rouge/10 focus:text-rouge"
        >
          <LogOut className="size-4" /> Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
