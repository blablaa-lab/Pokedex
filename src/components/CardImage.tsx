import { useState } from 'react'
import { ImageOff } from 'lucide-react'

/**
 * Image de carte robuste : si l'URL est absente ou casse (lien mort), on
 * affiche un placeholder grisé au lieu de l'icône d'image cassée du navigateur.
 * Le parent fournit la boîte (ratio, arrondi, overflow).
 */
export function CardImage({ src, alt }: { src?: string; alt: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return (
      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-400">
        <ImageOff className="size-[22%] max-h-8 max-w-8 opacity-60" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      className="h-full w-full object-cover"
    />
  )
}
