import type { Doc } from '../../convex/_generated/dataModel'
import { CardTile, cardEstimate } from './CardTile'

export interface CollectionItem {
  entry: Doc<'cardEntries'>
  card: Doc<'cards'> | null
}

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

interface Group {
  setId: string
  setName: string
  items: Array<{ entry: Doc<'cardEntries'>; card: Doc<'cards'> }>
  total: number
}

function groupBySet(items: Array<CollectionItem>): Array<Group> {
  const map = new Map<string, Group>()
  for (const it of items) {
    if (!it.card) continue
    let g = map.get(it.card.setId)
    if (!g) {
      g = { setId: it.card.setId, setName: it.card.setName ?? it.card.setId, items: [], total: 0 }
      map.set(it.card.setId, g)
    }
    g.items.push({ entry: it.entry, card: it.card })
    const est = cardEstimate(it.card)
    if (est !== null) g.total += est * it.entry.quantity
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

/** Grille groupée par collection : bandeau (nom + nb de cartes + valeur) puis
 *  la grille des cartes dessous. */
export function CollectionGrid({ items }: { items: Array<CollectionItem> }) {
  const groups = groupBySet(items)
  if (groups.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Aucune carte. Scanne-en une ou ajoute depuis la recherche.
      </p>
    )
  }
  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.setId} className="space-y-3">
          <div className="rounded-xl border border-border bg-secondary px-4 py-2.5">
            <div className="font-display font-bold">{g.setName}</div>
            <div className="text-xs text-muted-foreground">
              {g.items.length} {g.items.length > 1 ? 'cartes' : 'carte'}
              {g.total > 0 && <span className="ml-1.5 font-semibold text-ink">{eur(g.total)}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {g.items.map(({ entry, card }) => (
              <CardTile key={entry._id} card={card} quantity={entry.quantity} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
