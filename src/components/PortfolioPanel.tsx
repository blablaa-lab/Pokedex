import type { Doc } from '../../convex/_generated/dataModel'
import { CardImage } from './CardImage'

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

export interface TopCard {
  card: Doc<'cards'>
  est: number
}

function Chart({ data }: { data: Array<{ at: number; totalEur: number }> }) {
  if (data.length < 2) {
    return (
      <div className="grid h-24 place-items-center rounded-lg bg-secondary text-xs text-muted-foreground">
        L'historique se construit jour après jour…
      </div>
    )
  }
  const vals = data.map((d) => d.totalEur)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const n = data.length
  const pts = data.map((d, i) => {
    const x = (i / (n - 1)) * 100
    const y = 36 - ((d.totalEur - min) / span) * 32 + 2
    return [x, y] as const
  })
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  const area = `${line} L 100 40 L 0 40 Z`
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-24 w-full">
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--rouge)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--rouge)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#pg)" />
      <path
        d={line}
        fill="none"
        stroke="var(--rouge)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Graphe d'évolution du portefeuille (à placer sous le total). */
export function PortfolioChart({ history }: { history: Array<{ at: number; totalEur: number }> }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Évolution du portefeuille
      </div>
      <Chart data={history} />
    </div>
  )
}

/** Top 4 cartes les plus chères — cliquables pour ouvrir le détail. */
export function TopCards({
  top4,
  onSelect,
}: {
  top4: Array<TopCard>
  onSelect: (card: Doc<'cards'>) => void
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Top 4 · cartes les plus chères
      </div>
      {top4.length === 0 ? (
        <p className="text-xs text-muted-foreground">Pas encore de prix estimés.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {top4.map(({ card, est }) => (
            <button key={card._id} onClick={() => onSelect(card)} className="group text-left">
              <div className="holo aspect-[63/88] overflow-hidden rounded-lg bg-surface-2 transition-transform group-hover:-translate-y-0.5">
                <CardImage src={card.imageUrl} alt={card.nameFr ?? card.nameEn ?? ''} />
              </div>
              <div className="mt-1 truncate text-[11px] font-semibold leading-tight">
                {card.nameFr ?? card.nameEn}
              </div>
              <div className="text-[11px] font-bold text-rouge">{eur(est)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
