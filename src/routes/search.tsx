import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { Search as SearchIcon, Camera, Check } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { CardTile } from '../components/CardTile'
import { AddToPokedexDialog } from '../components/AddToPokedexDialog'
import { useScan } from '../lib/scan-context'

export const Route = createFileRoute('/search')({ component: SearchPage })

type Mode = 'nom' | 'numero' | 'artiste'
const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'nom', label: 'Nom' },
  { id: 'numero', label: 'Numéro de carte' },
  { id: 'artiste', label: 'Artiste' },
]

function SearchPage() {
  const { openScan } = useScan()
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<Mode>('nom')
  const [exact, setExact] = useState(false)
  const [addCard, setAddCard] = useState<Doc<'cards'> | null>(null)

  const term = q.trim()
  const active = term !== '' && mode !== 'artiste'
  const args = mode === 'nom' ? { text: term } : mode === 'numero' ? { localId: term } : null
  const raw = useQuery(api.cards.search, active && args ? { ...args, limit: 80 } : 'skip')
  const results =
    raw && exact && mode === 'nom'
      ? raw.filter(
          (c) =>
            c.nameFr?.toLowerCase() === term.toLowerCase() ||
            c.nameEn?.toLowerCase() === term.toLowerCase(),
        )
      : raw

  return (
    <div className="space-y-4">
      {/* Grand champ de recherche */}
      <div className="relative mx-auto max-w-2xl">
        <SearchIcon className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-gray" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          inputMode={mode === 'numero' ? 'numeric' : 'text'}
          placeholder={mode === 'numero' ? 'Numéro de collecteur, ex. 25' : 'Rechercher une carte'}
          className="h-12 w-full rounded-full bg-secondary pl-12 pr-14 text-[15px] outline-none transition placeholder:text-gray focus:bg-muted focus:ring-2 focus:ring-ink/10"
        />
        <button
          onClick={openScan}
          aria-label="Scanner une carte"
          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink transition hover:bg-white"
        >
          <Camera className="size-5" />
        </button>
      </div>

      {/* Onglets de filtre (texte simple, façon Pinterest) */}
      <div className="no-scrollbar -mx-3 flex items-center gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:justify-center sm:px-0">
        {MODES.map((m) => {
          const on = mode === m.id
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-[15px] font-semibold transition ${
                on ? 'bg-ink text-white' : 'text-ink hover:bg-secondary'
              }`}
            >
              {m.label}
            </button>
          )
        })}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <button
          onClick={() => setExact((e) => !e)}
          disabled={mode !== 'nom'}
          className={`flex shrink-0 items-center gap-1 rounded-full px-3.5 py-2 text-[15px] font-semibold transition disabled:opacity-40 ${
            exact && mode === 'nom' ? 'bg-secondary text-ink' : 'text-ink hover:bg-secondary'
          }`}
        >
          {exact && mode === 'nom' && <Check className="size-4" />}
          Recherche exacte
        </button>
      </div>

      {/* Résultats en masonry */}
      {mode === 'artiste' ? (
        <p className="mx-auto max-w-md rounded-2xl bg-secondary p-5 text-center text-sm text-muted-foreground">
          La recherche par artiste arrivera avec l'enrichissement du catalogue
          (illustrateurs non inclus dans le seed). Les cartes scannées rapportent
          déjà cette donnée.
        </p>
      ) : !active ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Saisis un {mode === 'numero' ? 'numéro' : 'nom'} pour lancer la recherche.
        </p>
      ) : results === undefined ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Recherche…</p>
      ) : results.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Aucun résultat.</p>
      ) : (
        <div className="masonry">
          {results.map((card) => (
            <CardTile key={card._id} card={card} onAdd={() => setAddCard(card)} />
          ))}
        </div>
      )}

      <AddToPokedexDialog card={addCard} onClose={() => setAddCard(null)} />
    </div>
  )
}
