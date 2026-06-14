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

/** Colonne droite des stats : évolution du portefeuille + top 4 cartes. */
export function PortfolioPanel({
  history,
  top4,
}: {
  history: Array<{ at: number; totalEur: number }>
  top4: Array<TopCard>
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-4">
      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Évolution du portefeuille
        </div>
        <Chart data={history} />
      </div>

      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Top 4 · cartes les plus chères
        </div>
        {top4.length === 0 ? (
          <p className="text-xs text-muted-foreground">Pas encore de prix estimés.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {top4.map(({ card, est }) => (
              <div key={card._id}>
                <div className="holo aspect-[63/88] overflow-hidden rounded-lg bg-surface-2">
                  <CardImage src={card.imageUrl} alt={card.nameFr ?? card.nameEn ?? ''} />
                </div>
                <div className="mt-1 truncate text-[11px] font-semibold leading-tight">
                  {card.nameFr ?? card.nameEn}
                </div>
                <div className="text-[11px] font-bold text-rouge">{eur(est)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
