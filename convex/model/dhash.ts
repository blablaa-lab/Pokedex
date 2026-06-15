// ─────────────────────────────────────────────────────────────────────────
// dHash (difference hash) PUR — empreinte perceptuelle 64 bits d'une image.
// Algorithme IDENTIQUE côté serveur (catalogue) et client (scan) pour que les
// empreintes soient comparables. Robuste à la luminosité (compare des gradients).
// ─────────────────────────────────────────────────────────────────────────

export const HASH_W = 9;
export const HASH_H = 8; // 9×8 → 8×8 = 64 bits

/**
 * Réduit des pixels RGBA (largeur w × hauteur h) en une grille de luminance
 * outW×outH (box-average), pour que le redimensionnement soit déterministe des
 * deux côtés (et non dépendant du resampling du navigateur/lib).
 */
export function toGrayGrid(
  rgba: Uint8Array | Uint8ClampedArray | Array<number>,
  w: number,
  h: number,
  outW: number = HASH_W,
  outH: number = HASH_H,
): Array<number> {
  const grid = new Array<number>(outW * outH).fill(0);
  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      const x0 = Math.floor((ox * w) / outW);
      const x1 = Math.max(x0 + 1, Math.floor(((ox + 1) * w) / outW));
      const y0 = Math.floor((oy * h) / outH);
      const y1 = Math.max(y0 + 1, Math.floor(((oy + 1) * h) / outH));
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          sum += 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
          count += 1;
        }
      }
      grid[oy * outW + ox] = count > 0 ? sum / count : 0;
    }
  }
  return grid;
}

function bitsToHex(bits: string): string {
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/** Empreinte dHash (16 hex = 64 bits) depuis une grille de luminance 9×8. */
export function dhashFromGrid(grid: Array<number>, outW = HASH_W, outH = HASH_H): string {
  let bits = "";
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW - 1; x++) {
      bits += grid[y * outW + x] < grid[y * outW + x + 1] ? "1" : "0";
    }
  }
  return bitsToHex(bits);
}

/** Empreinte directe depuis des pixels RGBA. */
export function dhashFromRgba(
  rgba: Uint8Array | Uint8ClampedArray | Array<number>,
  w: number,
  h: number,
): string {
  return dhashFromGrid(toGrayGrid(rgba, w, h));
}

const POPCOUNT = Array.from({ length: 16 }, (_, n) =>
  ((n >> 0) & 1) + ((n >> 1) & 1) + ((n >> 2) & 1) + ((n >> 3) & 1),
);

/** Distance de Hamming entre deux empreintes hex de même longueur (0..64). */
export function hamming(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    d += POPCOUNT[(parseInt(a[i], 16) ^ parseInt(b[i], 16)) & 0xf];
  }
  return d;
}
