// ─────────────────────────────────────────────────────────────────────────
// Parsing PUR du numéro de collecteur depuis le texte OCR (PRD §7).
// On vise le NUMÉRO (« 025/165 »), pas le nom : numérique → pas d'OCR FR à
// gérer, et le numéro est quasi une clé unique. Testable hors-ligne (l'OCR
// lui-même, lui, ne se valide qu'à la main avec de vraies cartes).
// ─────────────────────────────────────────────────────────────────────────

export interface DetectedNumber {
  /** localId normalisé sans zéros de tête, ex. "25". null si rien trouvé. */
  localId: string | null
  /** total du set (« /165 ») s'il est présent — sert à borner les sets. */
  total: number | null
  /** texte OCR brut (debug). */
  raw: string
}

/** Retire les zéros de tête d'un numéro purement numérique ("025" → "25"). */
function stripLeadingZeros(num: string): string {
  if (!/^\d+$/.test(num)) return num
  const n = String(parseInt(num, 10))
  return n
}

/**
 * Extrait le numéro de collecteur du texte OCR.
 * Priorité au format « N/M » (très discriminant), sinon un nombre isolé.
 */
export function parseCollectorNumber(raw: string): DetectedNumber {
  const text = raw.replace(/\s+/g, ' ')

  // Format « 25/165 » (avec tolérance aux espaces autour du séparateur).
  const fraction = text.match(/(\d{1,3})\s*\/\s*(\d{1,3})/)
  if (fraction) {
    return {
      localId: stripLeadingZeros(fraction[1]),
      total: parseInt(fraction[2], 10),
      raw,
    }
  }

  // Repli : un nombre isolé (1 à 3 chiffres) — moins fiable, set inconnu.
  const single = text.match(/\b(\d{1,3})\b/)
  if (single) {
    return { localId: stripLeadingZeros(single[1]), total: null, raw }
  }

  return { localId: null, total: null, raw }
}
