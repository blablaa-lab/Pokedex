import type { OcrFn, ScanImageSource } from './scanCard'

// ─────────────────────────────────────────────────────────────────────────
// OCR par défaut : Tesseract.js (navigateur, gratuit, PRD §7).
// Import dynamique → chargé UNIQUEMENT côté client, jamais au SSR/build.
// La précision dépend de vraies cartes / reflets holo / éclairage : NON testé
// en automatique. Pistes de réglage (phase manuelle) : crop du bas de carte,
// whitelist de caractères (chiffres + « / »), upscale.
// ─────────────────────────────────────────────────────────────────────────

export const tesseractOcr: OcrFn = async (image: ScanImageSource) => {
  const { recognize } = await import('tesseract.js')
  const { data } = await recognize(image, 'eng')
  return data.text
}

export interface OcrScanner {
  recognize: (image: ScanImageSource) => Promise<string>
  terminate: () => Promise<void>
}

/**
 * Scanner OCR à worker RÉUTILISABLE pour l'analyse en continu (auto-capture) :
 * on whiteliste chiffres + « / » (on ne lit que le numéro) → plus rapide et
 * plus fiable image par image. À terminer à la fermeture de la modal.
 */
export async function createOcrScanner(): Promise<OcrScanner> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  await worker.setParameters({ tessedit_char_whitelist: '0123456789/' })
  return {
    recognize: async (image) => (await worker.recognize(image)).data.text,
    terminate: async () => {
      await worker.terminate()
    },
  }
}
