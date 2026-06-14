import type { Doc } from '../../convex/_generated/dataModel'

/** Vignette d'une carte du catalogue : visuel FR + nom FR (EN en secondaire). */
export function CardThumb({ card }: { card: Doc<'cards'> }) {
  return (
    <div className="space-y-1">
      <div className="aspect-[63/88] overflow-hidden rounded-md border bg-muted">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.nameFr ?? card.nameEn ?? card.tcgdexId}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">
            (pas d'image)
          </div>
        )}
      </div>
      <div className="text-sm font-medium leading-tight">
        {card.nameFr ?? card.nameEn ?? card.tcgdexId}
      </div>
      {card.nameEn && card.nameEn !== card.nameFr && (
        <div className="text-xs text-muted-foreground">{card.nameEn}</div>
      )}
      <div className="text-xs text-muted-foreground">
        {card.setName ?? card.setId} · #{card.localId}
      </div>
    </div>
  )
}
