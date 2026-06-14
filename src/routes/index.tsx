import { createFileRoute, Link } from '@tanstack/react-router'
import { useAction, useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw, Sparkles } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { CollectionGrid } from '../components/CollectionGrid'
import type { GridSize } from '../components/CollectionGrid'
import { cardEstimate } from '../components/CardTile'

export const Route = createFileRoute('/')({ component: Collection })

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

type Lang = 'all' | 'fr' | 'en' | 'jp'
const LANGS: Array<{ id: Lang; label: string }> = [
  { id: 'all', label: '🌍 Toutes' },
  { id: 'fr', label: '🇫🇷 FR' },
  { id: 'en', label: '🇬🇧 EN' },
  { id: 'jp', label: '🇯🇵 JP' },
]
const SIZES: Array<{ id: GridSize; label: string }> = [
  { id: 'sm', label: 'Petit' },
  { id: 'md', label: 'Moyen' },
  { id: 'lg', label: 'Grand' },
]

const seg = 'rounded-full py-2 text-sm font-medium text-gray transition'
const segOn = 'rounded-full bg-white py-2 text-sm font-semibold text-ink shadow-sm'

function Collection() {
  const pokedexes = useQuery(api.pokedexes.list)
  const [selected, setSelected] = useState<Id<'pokedexes'> | null>(null)
  const [lang, setLang] = useState<Lang>('all')
  const [size, setSize] = useState<GridSize>('md')

  const activeId = selected ?? pokedexes?.[0]?._id ?? null
  const view = useQuery(api.cardEntries.pokedexView, activeId ? { pokedexId: activeId } : 'skip')
  const refresh = useAction(api.prices.refreshPokedex)
  const [refreshing, setRefreshing] = useState(false)

  const items = useMemo(() => {
    const all = view?.items ?? []
    return lang === 'all' ? all : all.filter((i) => i.entry.language === lang)
  }, [view, lang])

  const stats = useMemo(() => {
    let total = 0
    for (const { entry, card } of items) {
      const est = card ? cardEstimate(card) : null
      if (est !== null) total += est * entry.quantity
    }
    return { count: items.length, total }
  }, [items])

  async function handleRefresh() {
    if (!activeId) return
    setRefreshing(true)
    try {
      const res = await refresh({ pokedexId: activeId })
      if (res.skipped || res.attempted === 0) toast.info('Prix déjà à jour (< 6 h).')
      else toast.success(`${res.updated}/${res.attempted} prix mis à jour.`)
    } catch {
      toast.error('Échec du rafraîchissement.')
    } finally {
      setRefreshing(false)
    }
  }

  if (pokedexes === undefined) {
    return <p className="py-16 text-center text-muted-foreground">Chargement…</p>
  }

  if (pokedexes.length === 0) {
    return (
      <div className="rise mx-auto max-w-md space-y-4 py-16 text-center">
        <Sparkles className="mx-auto size-10 text-rouge" />
        <h1 className="font-display text-2xl font-extrabold">Ta collection commence ici</h1>
        <p className="text-sm text-muted-foreground">
          Crée un premier classeur, puis scanne ou cherche des cartes.
        </p>
        <Link
          to="/pokedexes"
          className="inline-block rounded-full bg-rouge px-5 py-2.5 text-sm font-semibold text-white"
        >
          Créer un classeur
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold">Mes cartes</h1>

      <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        {pokedexes.map((p) => {
          const on = p._id === activeId
          return (
            <button
              key={p._id}
              onClick={() => setSelected(p._id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                on ? 'bg-ink text-white' : 'bg-secondary text-ink hover:bg-muted'
              }`}
            >
              {p.name}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-full bg-secondary p-1">
        {LANGS.map((l) => (
          <button key={l.id} onClick={() => setLang(l.id)} className={lang === l.id ? segOn : seg}>
            {l.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <p className="text-sm">
            <span className="font-display text-xl font-extrabold">{stats.count}</span>{' '}
            {stats.count > 1 ? 'cartes' : 'carte'} dans votre collection
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Estimation totale ·{' '}
            <span className="font-semibold text-ink">{eur(stats.total)}</span>
          </p>
        </div>
        {view && view.lastPriceUpdate > 0 && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Mise à jour…' : 'Rafraîchir les prix'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-full bg-secondary p-1">
        {SIZES.map((s) => (
          <button key={s.id} onClick={() => setSize(s.id)} className={size === s.id ? segOn : seg}>
            {s.label}
          </button>
        ))}
      </div>

      {view === undefined ? (
        <p className="py-16 text-center text-muted-foreground">Chargement…</p>
      ) : (
        <CollectionGrid items={items} size={size} />
      )}
    </div>
  )
}
