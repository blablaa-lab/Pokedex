import { createFileRoute } from '@tanstack/react-router'
import { useAction, useQuery } from 'convex/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { CardTile } from '../components/CardTile'
import { AddToPokedexDialog } from '../components/AddToPokedexDialog'
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

const filterBtn =
  'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition'

function SearchPage() {
  // La recherche est pilotée par le champ du header (→ ?q=). Pas de second champ.
  const { q: urlQ } = Route.useSearch()
  const [exact, setExact] = useState(false)
  const [collection, setCollection] = useState<string | null>(null)
  const [year, setYear] = useState<number | null>(null)
  const [colOpen, setColOpen] = useState(false)
  const [yearOpen, setYearOpen] = useState(false)
  const [addCard, setAddCard] = useState<Doc<'cards'> | null>(null)
  const [limit, setLimit] = useState(60)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const sets = useQuery(api.sets.list)
  const setYearOf = useMemo(() => {
    const m = new Map<string, number | undefined>()
    for (const s of sets ?? []) m.set(s.tcgdexId, s.year)
    return m
  }, [sets])
  const years = useMemo(
    () =>
      [...new Set((sets ?? []).map((s) => s.year).filter((y): y is number => !!y))].sort(
        (a, b) => b - a,
      ),
    [sets],
  )
  const collectionName = sets?.find((s) => s.tcgdexId === collection)?.name

  const term = (urlQ ?? '').trim()
  const isNum = /^\d+$/.test(term)
  const active = term !== '' || collection !== null
  // Auto : un terme numérique cherche par numéro, sinon par nom.
  const args = term
    ? isNum
      ? { localId: term, setId: collection ?? undefined }
      : { text: term, setId: collection ?? undefined }
    : collection
      ? { setId: collection }
      : null

  const raw = useQuery(api.cards.search, args ? { ...args, limit } : 'skip')

  // Lazy-load au scroll : limite relevée par paliers tant qu'il reste des
  // résultats. Reset quand la requête change.
  useEffect(() => {
    setLimit(60)
  }, [term, collection])
  const canLoadMore = raw !== undefined && raw.length >= limit && limit < 240
  useEffect(() => {
    if (!canLoadMore) return
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setLimit((l) => Math.min(l + 60, 240))
      },
      { rootMargin: '800px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [canLoadMore])

  const results = useMemo(() => {
    let r = raw ?? undefined
    if (!r) return r
    if (year !== null) r = r.filter((c) => setYearOf.get(c.setId) === year)
    if (exact && term !== '') {
      r = r.filter(
        (c) =>
          c.nameFr?.toLowerCase() === term.toLowerCase() ||
          c.nameEn?.toLowerCase() === term.toLowerCase() ||
          c.localId === term,
      )
    }
    return r
  }, [raw, year, setYearOf, exact, term])

  // Groupement par collection (bandeau + cartes), ordre d'apparition préservé.
  const groups = useMemo(() => {
    const map = new Map<string, { setId: string; setName: string; cards: Array<Doc<'cards'>> }>()
    for (const c of results ?? []) {
      const g = map.get(c.setId) ?? { setId: c.setId, setName: c.setName ?? c.setId, cards: [] }
      g.cards.push(c)
      map.set(c.setId, g)
    }
    return [...map.values()]
  }, [results])

  // Enrichissement paresseux des prix des résultats visibles sans prix.
  const ensurePrices = useAction(api.prices.ensurePrices)
  const requestedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!results || results.length === 0) return
    const missing = results
      .filter((c) => !c.prices && !requestedRef.current.has(c._id))
      .slice(0, 30)
      .map((c) => c._id)
    if (missing.length === 0) return
    const t = setTimeout(() => {
      missing.forEach((id) => requestedRef.current.add(id))
      void ensurePrices({ cardIds: missing })
    }, 600)
    return () => clearTimeout(t)
  }, [results, ensurePrices])

  return (
    <div className="space-y-4">
      {/* Filtres combinables : Collection · Année · Exacte */}
      <div className="no-scrollbar -mx-3 flex items-center justify-center gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
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
          <PopoverContent align="center" className="w-72 rounded-2xl p-0">
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
          <PopoverContent align="center" className="w-56 rounded-2xl p-2">
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

        <button
          onClick={() => setExact((e) => !e)}
          className={`${filterBtn} ${exact ? 'border-ink bg-ink text-white' : 'border-border bg-card text-ink hover:border-ink/30'}`}
        >
          {exact && <Check className="size-4" />}
          Exacte
        </button>
      </div>

      {/* Résultats groupés par collection */}
      {!active ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Recherche une carte depuis la barre du haut, ou choisis une collection.
        </p>
      ) : results === undefined ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Recherche…</p>
      ) : results.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Aucun résultat.</p>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.setId} className="space-y-3">
              <div className="rounded-xl border border-border bg-secondary px-4 py-2.5">
                <div className="font-display font-bold">{g.setName}</div>
                <div className="text-xs text-muted-foreground">
                  {g.cards.length} {g.cards.length > 1 ? 'cartes' : 'carte'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {g.cards.map((card) => (
                  <CardTile key={card._id} card={card} onAdd={() => setAddCard(card)} />
                ))}
              </div>
            </section>
          ))}
          {canLoadMore && (
            <div ref={sentinelRef} className="py-6 text-center text-sm text-muted-foreground">
              Chargement…
            </div>
          )}
        </div>
      )}

      <AddToPokedexDialog card={addCard} onClose={() => setAddCard(null)} />
    </div>
  )
}
