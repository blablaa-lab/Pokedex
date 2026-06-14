import { createFileRoute } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { CardThumb } from '../components/CardThumb'
import { Button } from '../components/ui/button'

export const Route = createFileRoute('/pokedex/$pokedexId')({
  component: PokedexView,
})

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

function ago(ts: number): string {
  if (!ts) return 'jamais'
  const diffH = (Date.now() - ts) / 3_600_000
  if (diffH < 1) return "il y a moins d'une heure"
  if (diffH < 24) return `il y a ${Math.round(diffH)} h`
  return `il y a ${Math.round(diffH / 24)} j`
}

function PokedexView() {
  const { pokedexId } = Route.useParams()
  const id = pokedexId as Id<'pokedexes'>
  const view = useQuery(api.cardEntries.pokedexView, { pokedexId: id })
  const refresh = useAction(api.prices.refreshPokedex)
  const removeEntry = useMutation(api.cardEntries.remove)
  const [refreshing, setRefreshing] = useState(false)

  if (view === undefined) return <p className="text-muted-foreground">Chargement…</p>
  if (view === null)
    return <p className="text-muted-foreground">Pokédex introuvable.</p>

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await refresh({ pokedexId: id })
      if (res.skipped || res.attempted === 0) {
        toast.info('Prix déjà à jour (rafraîchis il y a moins de 6 h).')
      } else {
        toast.success(`${res.updated}/${res.attempted} prix mis à jour.`)
      }
    } catch {
      toast.error('Échec du rafraîchissement des prix.')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{view.pokedex.name}</h1>
          <p className="text-sm text-muted-foreground">
            Valeur estimée : <strong>{eur(view.totalEur)}</strong>
            {' · '}
            {view.pricedCount} cartes tarifées
            {view.unpricedCount > 0 && `, ${view.unpricedCount} sans prix`}
            {' · '}
            tarifs {ago(view.lastPriceUpdate)}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Rafraîchissement…' : 'Rafraîchir les prix'}
        </Button>
      </div>

      {view.items.length === 0 ? (
        <p className="text-muted-foreground">
          Pokédex vide — ajoute des cartes depuis la recherche.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {view.items.map(({ entry, card }) => {
            const p = card?.prices
            const estimate = p?.eurAvg30 ?? p?.eurTrend ?? p?.eurLow ?? null
            return (
              <div key={entry._id} className="space-y-1">
                {card ? (
                  <CardThumb card={card} />
                ) : (
                  <div className="text-sm text-muted-foreground">Carte supprimée</div>
                )}
                <div className="text-xs">
                  ×{entry.quantity}
                  {entry.condition && ` · ${entry.condition}`}
                  {entry.language && ` · ${entry.language.toUpperCase()}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {estimate !== null ? eur(estimate) : 'prix —'}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await removeEntry({ entryId: entry._id })
                    toast.success('Entrée retirée')
                  }}
                >
                  Retirer
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
