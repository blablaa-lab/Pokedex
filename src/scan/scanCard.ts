import { parseCollectorNumber } from './parseCollectorNumber'
import type { DetectedNumber } from './parseCollectorNumber'
import type { Doc } from '../../convex/_generated/dataModel'

// ─────────────────────────────────────────────────────────────────────────
// Interface STABLE du scan (PRD §7) : scanCard(image) → candidats.
// OCR et lookup catalogue sont INJECTÉS → le pipeline est découplé de
// Tesseract et de Convex (on pourra brancher Google Vision en repli sans
// réécrire le reste). La qualité OCR se valide À LA MAIN (vraies cartes).
// ─────────────────────────────────────────────────────────────────────────

export type ScanImageSource =
  | Blob
  | File
  | string
  | HTMLCanvasElement
  | HTMLImageElement

export type ScanCandidate = Doc<'cards'>

/** Reconnaissance de texte sur l'image (Tesseract aujourd'hui, Vision en repli). */
export type OcrFn = (image: ScanImageSource) => Promise<string>

/** Recherche des candidats au catalogue depuis le numéro détecté. */
export type CandidateLookup = (q: {
  localId: string
  total: number | null
  setId?: string
}) => Promise<Array<ScanCandidate>>

export interface ScanResult {
  detected: DetectedNumber
  candidates: Array<ScanCandidate>
}

/**
 * Pipeline : OCR → parse du numéro → requête candidats. Renvoie 0..N candidats
 * que l'utilisateur CONFIRME ensuite (jamais d'ajout automatique, PRD §5).
 */
export async function scanCard(
  image: ScanImageSource,
  deps: { ocr: OcrFn; lookup: CandidateLookup; setId?: string },
): Promise<ScanResult> {
  const raw = await deps.ocr(image)
  const detected = parseCollectorNumber(raw)
  const candidates = detected.localId
    ? await deps.lookup({
        localId: detected.localId,
        total: detected.total,
        setId: deps.setId,
      })
    : []
  return { detected, candidates }
}
