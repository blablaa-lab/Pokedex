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
