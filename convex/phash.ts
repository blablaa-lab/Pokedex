import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { decode } from "fast-png";
import { dhashFromGrid, toGrayGrid } from "./model/dhash";

// ─────────────────────────────────────────────────────────────────────────
// Calcul des empreintes perceptuelles (dHash) du catalogue, pour le scan par
// reconnaissance d'image. Job auto-relancé (curseur) sur une passe unique.
// On hashe la version `low.png` (petite) de chaque carte.
// ─────────────────────────────────────────────────────────────────────────

interface Decoded {
  width: number;
  height: number;
  channels: number;
  data: Uint8Array | Uint16Array;
}

/** Normalise les pixels décodés en RGBA (stride 4). */
function toRgba(img: Decoded): Uint8Array {
  const { data, width, height, channels } = img;
  const px = width * height;
  const out = new Uint8Array(px * 4);
  for (let i = 0; i < px; i++) {
    let r: number;
    let g: number;
    let b: number;
    if (channels === 1) {
      r = g = b = data[i];
    } else if (channels === 2) {
      r = g = b = data[i * 2];
    } else if (channels === 3) {
      r = data[i * 3];
      g = data[i * 3 + 1];
      b = data[i * 3 + 2];
    } else {
      r = data[i * 4];
      g = data[i * 4 + 1];
      b = data[i * 4 + 2];
    }
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 255;
  }
  return out;
}

async function hashImage(imageUrl: string): Promise<string | null> {
  const url = imageUrl.replace("/high.webp", "/low.png");
  const res = await fetch(url);
  if (!res.ok) return null;
  const img = decode(new Uint8Array(await res.arrayBuffer())) as Decoded;
  const rgba = toRgba(img);
  return dhashFromGrid(toGrayGrid(rgba, img.width, img.height));
}

export const computeBatch = internalAction({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    pages: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { cursor = null, pages = 6 },
  ): Promise<{ processed: number; isDone: boolean }> => {
    let cur = cursor;
    let processed = 0;
    for (let p = 0; p < pages; p++) {
      const { items, continueCursor, isDone } = await ctx.runQuery(
        internal.phashStore.needPage,
        { cursor: cur, numItems: 250 },
      );
      const hashes = await Promise.all(
        items.map((it) => hashImage(it.imageUrl).catch(() => null)),
      );
      await Promise.all(
        hashes.map((phash, i) => {
          if (phash === null) return undefined;
          processed += 1;
          return ctx.runMutation(internal.phashStore.setPhash, {
            cardId: items[i].id,
            phash,
          });
        }),
      );
      cur = continueCursor;
      if (isDone) return { processed, isDone: true };
    }
    // Pas terminé → on relance automatiquement depuis le curseur.
    await ctx.scheduler.runAfter(0, internal.phash.computeBatch, { cursor: cur, pages });
    return { processed, isDone: false };
  },
});

/** Lance (ou relance) le calcul des empreintes. Public pour le CLI. */
export const start = action({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, { cursor }): Promise<string> => {
    await ctx.scheduler.runAfter(0, internal.phash.computeBatch, {
      cursor: cursor ?? null,
    });
    return "Calcul des empreintes perceptuelles lancé.";
  },
});
