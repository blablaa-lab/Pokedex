import type { Doc } from '../../convex/_generated/dataModel'

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

export function cardEstimate(card: Doc<'cards'>): number | null {
  const p = card.prices
  return p?.eurAvg30 ?? p?.eurTrend ?? p?.eurLow ?? null
}

/**
 * Vignette façon Pinterest : visuel dominant arrondi, reflet holo discret, et
 * — au survol — un bouton « Ajouter » rouge (comme « Enregistrer »). Nom + prix
 * en légende dessous.
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
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.nameFr ?? card.nameEn ?? card.tcgdexId}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center px-2 text-center text-[11px] text-muted-foreground">
            {card.nameFr ?? card.nameEn}
          </div>
        )}

        {/* Voile + bouton au survol */}
        {onAdd && (
          <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/25">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAdd()
              }}
              className="absolute right-2 top-2 translate-y-1 rounded-full bg-rouge px-3.5 py-2 text-sm font-bold text-white opacity-0 shadow transition group-hover:translate-y-0 group-hover:opacity-100 hover:bg-rouge-deep"
            >
              Ajouter
            </button>
          </div>
        )}

        {price !== null && (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/80 px-2 py-0.5 text-[11px] font-semibold text-white">
            {eur(price)}
          </span>
        )}
        {quantity !== undefined && quantity > 1 && (
          <span className="absolute right-2 top-2 grid min-w-5 place-items-center rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold text-ink shadow">
            ×{quantity}
          </span>
        )}
      </div>

      <div className="mt-1.5 truncate px-0.5 text-[13px] font-semibold leading-tight">
        {card.nameFr ?? card.nameEn ?? card.tcgdexId}
      </div>
      <div className="truncate px-0.5 text-[11px] text-muted-foreground">
        {card.setName ?? card.setId} · #{card.localId}
      </div>
    </div>
  )
}
