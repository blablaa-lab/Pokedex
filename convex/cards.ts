import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// Lecture du catalogue partagé (`cards`). Pas de filtrage user : le catalogue
// est commun à tous. La recherche bilingue arrive en P4, la fiche en P5.

/** Récupère une carte par son id TCGdex (identité stable). */
export const getByTcgdexId = query({
  args: { tcgdexId: v.string() },
  handler: async (ctx, { tcgdexId }) => {
    return await ctx.db
      .query("cards")
      .withIndex("by_tcgdexId", (q) => q.eq("tcgdexId", tcgdexId))
      .unique();
  },
});

/** Récupère une carte par son id Convex (fiche carte, P5). */
export const get = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    return await ctx.db.get(cardId);
  },
});

const MAX_RESULTS = 60;

/**
 * Recherche bilingue sur l'index `search_text` (FR ET EN via `searchText`),
 * avec filtre set optionnel et filtre numéro de collecteur (`localId`).
 * - `text` non vide → recherche plein-texte (option : restreinte au set).
 * - `text` vide + `setId` → parcourt le set (filtre numéro éventuel).
 * « Charizard » et « Dracaufeu » renvoient la même carte (test P4).
 */
export const search = query({
  args: {
    text: v.optional(v.string()),
    setId: v.optional(v.string()),
    localId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { text, setId, localId, limit }) => {
    const max = Math.min(limit ?? 40, MAX_RESULTS);
    const trimmed = (text ?? "").trim();
    let cards;

    if (trimmed.length > 0) {
      cards = await ctx.db
        .query("cards")
        .withSearchIndex("search_text", (q) => {
          const base = q.search("searchText", trimmed);
          return setId ? base.eq("setId", setId) : base;
        })
        // On élargit la prise quand un filtre numéro post-filtrera.
        .take(localId ? 200 : max);
    } else if (setId) {
      cards = await ctx.db
        .query("cards")
        .withIndex("by_set", (q) => q.eq("setId", setId))
        .take(localId ? 600 : max);
    } else if (localId) {
      // Recherche par numéro de collecteur seul (chip « Numéro de carte »).
      cards = await ctx.db
        .query("cards")
        .withIndex("by_local", (q) => q.eq("localId", localId))
        .take(max);
      return cards;
    } else {
      return []; // aucun critère
    }

    if (localId) {
      cards = cards.filter((c) => c.localId === localId);
    }
    return cards.slice(0, max);
  },
});

/**
 * Candidats pour le SCAN (Phase B) : depuis un numéro de collecteur détecté
 * par OCR. Borné par le set explicite, ou par le total « /M » (sets au
 * `cardCount` correspondant) — sinon trop de candidats (un même numéro existe
 * dans ~190 sets). Renvoie typiquement 1 à 3 cartes à CONFIRMER par l'user.
 */
export const scanCandidates = query({
  args: {
    localId: v.string(),
    total: v.optional(v.number()),
    setId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { localId, total, setId, limit }) => {
    const max = Math.min(limit ?? 12, 30);

    const fromSet = async (sid: string) => {
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_set", (q) => q.eq("setId", sid))
        .collect();
      return cards.filter((c) => c.localId === localId);
    };

    if (setId) {
      return (await fromSet(setId)).slice(0, max);
    }

    if (total !== undefined) {
      // Sets dont le nombre de cartes correspond au « /M » scanné.
      const sets = await ctx.db.query("sets").collect();
      const matchSetIds = sets
        .filter((s) => s.cardCount === total)
        .map((s) => s.tcgdexId);
      const out: Array<Doc<"cards">> = [];
      for (const sid of matchSetIds) {
        out.push(...(await fromSet(sid)));
        if (out.length >= max) break;
      }
      return out.slice(0, max);
    }

    // Numéro seul sans set ni total → trop ambigu pour borner : on renvoie vide
    // (l'UI invite à préciser le set).
    return [];
  },
});
