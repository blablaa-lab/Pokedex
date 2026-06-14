import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { STALE_CRON_MS } from "./model/prices";

// On mocke le SEUL point externe (l'API TCGdex) — pas la logique testée.
vi.mock("./providers/tcgdex", () => ({
  TcgdexProvider: class {
    async fetchPrice(tcgdexId: string) {
      if (tcgdexId === "no-price") return null;
      return {
        source: "tcgdex",
        eurAvg30: 4.04,
        eurTrend: 3.5,
        eurLow: 2,
        updatedAt: 1234,
      };
    }
  },
}));

const modules = import.meta.glob(["./**/*.*s", "!./**/*.test.*", "!./**/*.d.ts"]);

async function card(
  t: ReturnType<typeof convexTest>,
  tcgdexId: string,
  lastPriceUpdate?: number,
) {
  return await t.run((ctx) =>
    ctx.db.insert("cards", {
      tcgdexId,
      searchText: tcgdexId,
      localId: "1",
      setId: "s",
      lastPriceUpdate,
    }),
  );
}

test("refreshCards batche et écrit les prix (null = ignoré)", async () => {
  const t = convexTest(schema, modules);
  const ok = await card(t, "sv03-125");
  const none = await card(t, "no-price");

  const res = await t.action(internal.prices.refreshCards, {
    cardIds: [ok, none],
  });
  expect(res.attempted).toBe(2);
  expect(res.updated).toBe(1);

  const okCard = await t.run((ctx) => ctx.db.get(ok));
  expect(okCard?.prices?.eurAvg30).toBe(4.04);
  expect(okCard?.lastPriceUpdate).toBe(1234);
  const noneCard = await t.run((ctx) => ctx.db.get(none));
  expect(noneCard?.prices).toBeUndefined();
});

test("cron : sélectionne UNIQUEMENT les cartes référencées ET périmées (> 24h)", async () => {
  const t = convexTest(schema, modules);
  const now = 2_000_000_000_000;

  const refStale = await card(t, "ref-stale", now - STALE_CRON_MS - 1);
  const refFresh = await card(t, "ref-fresh", now - 1000);
  const unrefStale = await card(t, "unref-stale", undefined); // jamais maj

  const user = await t.run((ctx) => ctx.db.insert("users", { name: "u" }));
  const pdx = await t.run((ctx) =>
    ctx.db.insert("pokedexes", { userId: user, name: "p" }),
  );
  for (const cardId of [refStale, refFresh]) {
    await t.run((ctx) =>
      ctx.db.insert("cardEntries", { pokedexId: pdx, userId: user, cardId, quantity: 1 }),
    );
  }

  const ids = await t.query(internal.prices.selectStaleReferenced, { now });
  expect(ids).toEqual([refStale]); // ni le frais, ni le non-référencé
  expect(ids).not.toContain(refFresh);
  expect(ids).not.toContain(unrefStale);
});

test("bouton manuel : garde < 6h + ownership", async () => {
  const t = convexTest(schema, modules);
  const now = 2_000_000_000_000;
  const userA = await t.run((ctx) => ctx.db.insert("users", { name: "A" }));
  const userB = await t.run((ctx) => ctx.db.insert("users", { name: "B" }));
  const pdx = await t.run((ctx) =>
    ctx.db.insert("pokedexes", { userId: userA, name: "p" }),
  );

  const stale = await card(t, "stale", now - 7 * 60 * 60 * 1000); // 7h → à refresh
  const fresh = await card(t, "fresh", now - 60 * 60 * 1000); // 1h → gardé
  for (const cardId of [stale, fresh]) {
    await t.run((ctx) =>
      ctx.db.insert("cardEntries", { pokedexId: pdx, userId: userA, cardId, quantity: 1 }),
    );
  }

  const ids = await t.query(internal.prices.stalePokedexCardIds, {
    pokedexId: pdx,
    userId: userA,
    now,
  });
  expect(ids).toEqual([stale]); // le frais (<6h) est gardé

  // Un autre user → null (pas autorisé).
  const denied = await t.query(internal.prices.stalePokedexCardIds, {
    pokedexId: pdx,
    userId: userB,
    now,
  });
  expect(denied).toBeNull();
});

test("setPrice écrit prix + horodatage de fraîcheur", async () => {
  const t = convexTest(schema, modules);
  const c = await card(t, "x");
  await t.mutation(internal.prices.setPrice, {
    cardId: c,
    prices: { source: "tcgdex", eurAvg30: 9.9, updatedAt: 555 },
  });
  const got = await t.run((ctx) => ctx.db.get(c));
  expect(got?.prices?.eurAvg30).toBe(9.9);
  expect(got?.lastPriceUpdate).toBe(555);
});
