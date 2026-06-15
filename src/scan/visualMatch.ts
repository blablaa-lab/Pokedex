import type { ConvexReactClient } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { dhashFromGrid, hamming, toGrayGrid } from '../../convex/model/dhash'

// ─────────────────────────────────────────────────────────────────────────
// Reconnaissance de carte par empreinte perceptuelle (dHash), côté client.
// On charge l'index {id, phash} du catalogue (mis en cache mémoire pour la
// session), on hashe l'image filmée et on cherche les plus proches (Hamming).
// ─────────────────────────────────────────────────────────────────────────

const CARD_AR = 63 / 88

interface Entry {
  id: Id<'cards'>
  phash: string
}

let indexCache: Array<Entry> | null = null
let loading: Promise<Array<Entry>> | null = null

/** Charge (une fois par session) l'index des empreintes du catalogue. */
export async function ensureIndex(client: ConvexReactClient): Promise<Array<Entry>> {
  if (indexCache) return indexCache
  if (loading) return loading
  loading = (async () => {
    const all: Array<Entry> = []
    let cursor: string | null = null
    for (let i = 0; i < 80; i++) {
      const res: { items: Array<Entry>; continueCursor: string; isDone: boolean } =
        await client.query(api.cards.phashIndex, { cursor, numItems: 2000 })
      all.push(...res.items)
      cursor = res.continueCursor
      if (res.isDone) break
    }
    indexCache = all
    return all
  })()
  return loading
}

export function indexSize(): number {
  return indexCache?.length ?? 0
}

/** k plus proches empreintes du catalogue (distance de Hamming croissante). */
export function findNearest(hash: string, k = 4): Array<{ id: Id<'cards'>; dist: number }> {
  if (!indexCache) return []
  const best: Array<{ id: Id<'cards'>; dist: number }> = []
  let worst = 999
  for (const e of indexCache) {
    const d = hamming(hash, e.phash)
    if (best.length < k) {
      best.push({ id: e.id, dist: d })
      best.sort((a, b) => a.dist - b.dist)
      worst = best[best.length - 1].dist
    } else if (d < worst) {
      best[best.length - 1] = { id: e.id, dist: d }
      best.sort((a, b) => a.dist - b.dist)
      worst = best[best.length - 1].dist
    }
  }
  return best
}

/** Empreinte du recadrage central (ratio carte) de la frame vidéo. */
export function hashVideoFrame(video: HTMLVideoElement): string | null {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return null
  let cw = vw
  let ch = Math.round(vw / CARD_AR)
  if (ch > vh) {
    ch = vh
    cw = Math.round(vh * CARD_AR)
  }
  const sx = Math.floor((vw - cw) / 2)
  const sy = Math.floor((vh - ch) / 2)
  return hashCrop(video, sx, sy, cw, ch)
}

/** Empreinte d'une image importée (recadrée au ratio carte). */
export function hashImageElement(img: HTMLImageElement): string | null {
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  if (!iw || !ih) return null
  let cw = iw
  let ch = Math.round(iw / CARD_AR)
  if (ch > ih) {
    ch = ih
    cw = Math.round(ih * CARD_AR)
  }
  return hashCrop(img, Math.floor((iw - cw) / 2), Math.floor((ih - ch) / 2), cw, ch)
}

function hashCrop(
  src: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): string | null {
  const W = 126
  const H = 176
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, W, H)
  const data = ctx.getImageData(0, 0, W, H).data
  return dhashFromGrid(toGrayGrid(data, W, H))
}
