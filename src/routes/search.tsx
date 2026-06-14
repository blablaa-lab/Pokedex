import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { Search as SearchIcon, Camera, Check, ChevronDown, X } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { CardTile } from '../components/CardTile'
import { AddToPokedexDialog } from '../components/AddToPokedexDialog'
import { useScan } from '../lib/scan-context'
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../components/ui/command'

export const Route = createFileRoute('/search')({
  validateSearch: (s: Record<string, unknown>): { q?: string } => ({
    q: typeof s.q === 'string' ? s.q : undefined,
  }),
  component: SearchPage,
})

type Mode = 'nom' | 'numero'
const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'nom', label: 'Nom' },
  { id: 'numero', label: 'Numéro' },
]

const filterBtn =
  'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition'

function SearchPage() {
  const { openScan } = useScan()
  const { q: urlQ } = Route.useSearch()
  const [q, setQ] = useState(urlQ ?? '')
  const [mode, setMode] = useState<Mode>('nom')
  const [exact, setExact] = useState(false)
  const [collection, setCollection] = useState<string | null>(null)
  const [year, setYear] = useState<number | null>(null)
  const [colOpen, setColOpen] = useState(false)
  const [yearOpen, setYearOpen] = useState(false)
  const [addCard, setAddCard] = useState<Doc<'cards'> | null>(null)

  useEffect(() => {
    if (urlQ !== undefined) setQ(urlQ)
  }, [urlQ])

  const sets = useQuery(api.sets.list)
  const setYearOf = useMemo(() => {
    const m = new Map<string, number | undefined>()
    for (const s of sets ?? []) m.set(s.tcgdexId, s.year)
    return m
  }, [sets])
  const years = useMemo(
    () => [...new Set((sets ?? []).map((s) => s.year).filter((y): y is number => !!y))].sort((a, b) => b - a),
    [sets],
  )
  const collectionName = sets?.find((s) => s.tcgdexId === collection)?.name

  const term = q.trim()
  const active = term !== '' || collection !== null
  const args = !active
    ? null
    : mode === 'numero' && term !== ''
      ? { localId: term, setId: collection ?? undefined }
      : term !== ''
        ? { text: term, setId: collection ?? undefined }
        : { setId: collection ?? undefined }

  const raw = useQuery(api.cards.search, args ? { ...args, limit: 120 } : 'skip')
  const results = useMemo(() => {
    let r = raw ?? undefined
    if (!r) return r
    if (year !== null) r = r.filter((c) => setYearOf.get(c.setId) === year)
    if (exact && mode === 'nom' && term !== '') {
      r = r.filter(
        (c) =>
          c.nameFr?.toLowerCase() === term.toLowerCase() ||
          c.nameEn?.toLowerCase() === term.toLowerCase(),
      )
    }
    return r
  }, [raw, year, setYearOf, exact, mode, term])

  return (
    <div className="space-y-4">
      {/* Champ */}
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

      {/* Scope + filtres combinables */}
      <div className="no-scrollbar -mx-3 flex items-center gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
        {MODES.map((m) => {
          const on = mode === m.id
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                on ? 'bg-ink text-white' : 'text-ink hover:bg-secondary'
              }`}
            >
              {m.label}
            </button>
          )
        })}

        <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />

        {/* Collection */}
        <Popover open={colOpen} onOpenChange={setColOpen}>
          <PopoverTrigger
            className={`${filterBtn} ${collection ? 'border-ink bg-ink text-white' : 'border-border bg-card text-ink hover:border-ink/30'}`}
          >
            {collectionName ?? 'Collection'}
            {collection ? (
              <X
                className="size-4"
                onClick={(e) => {
                  e.stopPropagation()
                  setCollection(null)
                }}
              />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 rounded-2xl p-0">
            <Command>
              <CommandInput placeholder="Filtrer les collections…" />
              <CommandList>
                <CommandEmpty>Aucune collection.</CommandEmpty>
                <CommandGroup>
                  {(sets ?? []).map((s) => (
                    <CommandItem
                      key={s.tcgdexId}
                      value={`${s.name} ${s.year ?? ''}`}
                      onSelect={() => {
                        setCollection(s.tcgdexId)
                        setColOpen(false)
                      }}
                    >
                      <span className="flex-1 truncate">{s.name}</span>
                      {s.year && <span className="text-xs text-gray">{s.year}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Année */}
        <Popover open={yearOpen} onOpenChange={setYearOpen}>
          <PopoverTrigger
            className={`${filterBtn} ${year ? 'border-ink bg-ink text-white' : 'border-border bg-card text-ink hover:border-ink/30'}`}
          >
            {year ?? 'Année'}
            {year ? (
              <X
                className="size-4"
                onClick={(e) => {
                  e.stopPropagation()
                  setYear(null)
                }}
              />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 rounded-2xl p-2">
            <div className="grid max-h-64 grid-cols-3 gap-1 overflow-y-auto">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => {
                    setYear(y)
                    setYearOpen(false)
                  }}
                  className={`rounded-lg py-1.5 text-sm font-medium transition ${
                    year === y ? 'bg-ink text-white' : 'hover:bg-secondary'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {mode === 'nom' && (
          <button
            onClick={() => setExact((e) => !e)}
            className={`${filterBtn} ${exact ? 'border-ink bg-secondary text-ink' : 'border-border bg-card text-ink hover:border-ink/30'}`}
          >
            {exact && <Check className="size-4" />}
            Exacte
          </button>
        )}
      </div>

      {/* Résultats */}
      {!active ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Saisis un nom/numéro ou choisis une collection.
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
