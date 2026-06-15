import { describe, expect, test } from "vitest";
import { dhashFromRgba, hamming, toGrayGrid } from "./dhash";

// Construit des pixels RGBA d'une image w×h à partir d'une fonction de luminance.
function makeImg(w: number, h: number, lum: (x: number, y: number) => number): Uint8Array {
  const a = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const v = lum(x, y);
      a[i] = a[i + 1] = a[i + 2] = v;
      a[i + 3] = 255;
    }
  }
  return a;
}

describe("dhash", () => {
  test("empreinte = 16 hex (64 bits)", () => {
    const img = makeImg(40, 40, (x) => (x * 6) % 256);
    expect(dhashFromRgba(img, 40, 40)).toHaveLength(16);
  });

  test("image identique → distance 0", () => {
    const img = makeImg(48, 48, (x, y) => (x * 5 + y * 3) % 256);
    const a = dhashFromRgba(img, 48, 48);
    const b = dhashFromRgba(img, 48, 48);
    expect(hamming(a, b)).toBe(0);
  });

  test("robuste à un changement de luminosité global (gradient préservé)", () => {
    const grad = makeImg(48, 48, (x) => (x * 5) % 256);
    // Même image assombrie de 40 (les gradients restent dans le même sens).
    const dark = makeImg(48, 48, (x) => Math.max(0, ((x * 5) % 256) - 40));
    expect(hamming(dhashFromRgba(grad, 48, 48), dhashFromRgba(dark, 48, 48))).toBeLessThan(6);
  });

  test("images très différentes → grande distance", () => {
    const horiz = makeImg(48, 48, (x) => (x * 5) % 256);
    const vert = makeImg(48, 48, (_x, y) => (y * 5) % 256);
    expect(hamming(dhashFromRgba(horiz, 48, 48), dhashFromRgba(vert, 48, 48))).toBeGreaterThan(15);
  });

  test("toGrayGrid produit outW×outH valeurs", () => {
    const img = makeImg(20, 20, () => 128);
    expect(toGrayGrid(img, 20, 20, 9, 8)).toHaveLength(72);
  });
});
