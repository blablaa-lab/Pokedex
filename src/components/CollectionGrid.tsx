import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Doc } from '../../convex/_generated/dataModel'
import { CardTile, cardEstimate } from './CardTile'

export type GridSize = 'sm' | 'md' | 'lg'

export interface CollectionItem {
  entry: Doc<'cardEntries'>
  card: Doc<'cards'> | null
}

const cols: Record<GridSize, string> = {
  sm: 'grid-cols-4 sm:grid-cols-6',
  md: 'grid-cols-3 sm:grid-cols-4',
  lg: 'grid-cols-2 sm:grid-cols-3',
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
    const key = it.card.setId
    let g = map.get(key)
    if (!g) {
      g = { setId: key, setName: it.card.setName ?? key, items: [], total: 0 }
      map.set(key, g)
    }
    g.items.push({ entry: it.entry, card: it.card })
    const est = cardEstimate(it.card)
    if (est !== null) g.total += est * it.entry.quantity
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export function CollectionGrid({
  items,
  size,
}: {
  items: Array<CollectionItem>
  size: GridSize
}) {
  const groups = groupBySet(items)
  if (groups.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Aucune carte. Scanne-en une ou ajoute depuis la recherche.
      </p>
    )
  }
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <SetGroup key={g.setId} group={g} size={size} />
      ))}
    </div>
  )
}

function SetGroup({ group, size }: { group: Group; size: GridSize }) {
  const [open, setOpen] = useState(true)
  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm"
      >
        <div className="min-w-0">
          <div className="truncate font-display text-base font-bold">{group.setName}</div>
          <div className="text-xs text-muted-foreground">
            {group.items.length} {group.items.length > 1 ? 'cartes' : 'carte'}
            {group.total > 0 && (
              <span className="ml-1.5 font-semibold text-ink">{eur(group.total)}</span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`size-5 shrink-0 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div className={`mt-3 grid gap-3 ${cols[size]}`}>
          {group.items.map(({ entry, card }) => (
            <CardTile key={entry._id} card={card} quantity={entry.quantity} />
          ))}
        </div>
      )}
    </section>
  )
}
