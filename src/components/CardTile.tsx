import type { Doc } from '../../convex/_generated/dataModel'
import { CardImage } from './CardImage'

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

export function cardEstimate(card: Doc<'cards'>): number | null {
  const p = card.prices
  return p?.eurAvg30 ?? p?.eurTrend ?? p?.eurLow ?? null
}

/**
 * Vignette façon Pinterest : visuel arrondi (placeholder grisé si lien mort),
 * reflet holo discret, bouton « Ajouter » centré au survol. Légende : nom +
 * set à gauche, estimation de prix à droite.
 */
export function CardTile({
  card,
  quantity,
  onAdd,
}: {
  card: Doc<'cards'>
  quantity?: number
  onAdd?: () => void
}) {
  const price = cardEstimate(card)
  return (
    <div className="group">
      <div
        className={`holo relative aspect-[63/88] overflow-hidden rounded-2xl bg-surface-2 ${onAdd ? 'cursor-zoom-in' : ''}`}
        onClick={onAdd}
      >
        <CardImage src={card.imageUrl} alt={card.nameFr ?? card.nameEn ?? card.tcgdexId} />

        {/* Voile + bouton « Ajouter » centré au survol */}
        {onAdd && (
          <div className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/25">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAdd()
              }}
              className="scale-90 rounded-full bg-rouge px-5 py-2.5 text-sm font-bold text-white opacity-0 shadow-lg transition duration-200 group-hover:scale-100 group-hover:opacity-100 hover:bg-rouge-deep"
            >
              Ajouter
            </button>
          </div>
        )}

        {quantity !== undefined && quantity > 1 && (
          <span className="absolute right-2 top-2 grid min-w-5 place-items-center rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold text-ink shadow">
            ×{quantity}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold leading-tight">
            {card.nameFr ?? card.nameEn ?? card.tcgdexId}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {card.setName ?? card.setId} · #{card.localId}
          </div>
        </div>
        {price !== null && (
          <div className="shrink-0 pt-0.5 text-[13px] font-bold tabular-nums">{eur(price)}</div>
        )}
      </div>
    </div>
  )
}
