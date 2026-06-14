import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob(["./**/*.*s", "!./**/*.test.*", "!./**/*.d.ts"]);

async function makeUser(t: ReturnType<typeof convexTest>, name: string) {
  return await t.run((ctx) => ctx.db.insert("users", { name }));
}

async function makeCard(
  t: ReturnType<typeof convexTest>,
  tcgdexId: string,
  prices?: { eurAvg30?: number; updatedAt: number },
) {
  return await t.run((ctx) =>
    ctx.db.insert("cards", {
      tcgdexId,
      searchText: tcgdexId,
      localId: tcgdexId.split("-")[1] ?? "1",
      setId: tcgdexId.split("-")[0],
      prices: prices ? { source: "tcgdex", ...prices } : undefined,
    }),
  );
}

test("sécurité : un user n'ajoute/édite/supprime que dans ses pokédex", async () => {
  const t = convexTest(schema, modules);
  const userA = await makeUser(t, "Alice");
  const userB = await makeUser(t, "Bob");
  const asA = t.withIdentity({ subject: userA });
  const asB = t.withIdentity({ subject: userB });

  const pdxA = await asA.mutation(api.pokedexes.create, { name: "A" });
  const card = await makeCard(t, "base1-4");

  // B ne peut pas ajouter dans le pokédex de A.
  await expect(
    asB.mutation(api.cardEntries.add, { pokedexId: pdxA, cardId: card }),
  ).rejects.toThrow();

  // A ajoute, B ne peut pas éditer/supprimer l'entrée de A.
  const entry = (await asA.mutation(api.cardEntries.add, {
    pokedexId: pdxA,
    cardId: card,
  })) as Id<"cardEntries">;
  await expect(
    asB.mutation(api.cardEntries.update, { entryId: entry, quantity: 99 }),
  ).rejects.toThrow();
  await expect(
    asB.mutation(api.cardEntries.remove, { entryId: entry }),
  ).rejects.toThrow();
});

test("dédoublonnage : ré-ajouter la même carte incrémente la quantité", async () => {
  const t = convexTest(schema, modules);
  const userA = await makeUser(t, "Alice");
  const asA = t.withIdentity({ subject: userA });
  const pdx = await asA.mutation(api.pokedexes.create, { name: "A" });
  const card = await makeCard(t, "base1-4");

  await asA.mutation(api.cardEntries.add, { pokedexId: pdx, cardId: card, quantity: 2 });
  await asA.mutation(api.cardEntries.add, { pokedexId: pdx, cardId: card, quantity: 3 });

  const all = await t.run((ctx) => ctx.db.query("cardEntries").collect());
  expect(all).toHaveLength(1);
  expect(all[0].quantity).toBe(5);
});

test("vue pokédex : jointure cartes + valeur totale (entrées sans prix comptées)", async () => {
  const t = convexTest(schema, modules);
  const userA = await makeUser(t, "Alice");
  const asA = t.withIdentity({ subject: userA });
  const pdx = await asA.mutation(api.pokedexes.create, { name: "A" });

  const priced = await makeCard(t, "sv03-125", { eurAvg30: 4.04, updatedAt: 1000 });
  const unpriced = await makeCard(t, "base1-58");

  await asA.mutation(api.cardEntries.add, { pokedexId: pdx, cardId: priced, quantity: 2 });
  await asA.mutation(api.cardEntries.add, { pokedexId: pdx, cardId: unpriced, quantity: 5 });

  const view = await asA.query(api.cardEntries.pokedexView, { pokedexId: pdx });
  expect(view).not.toBeNull();
  expect(view!.items).toHaveLength(2);
  expect(view!.totalEur).toBeCloseTo(8.08, 2); // 2 × 4.04
  expect(view!.pricedCount).toBe(1);
  expect(view!.unpricedCount).toBe(1);
  expect(view!.lastPriceUpdate).toBe(1000);
  // Jointure : chaque entrée porte sa carte.
  const tcgdexIds = view!.items.map((i) => i.card?.tcgdexId).sort();
  expect(tcgdexIds).toEqual(["base1-58", "sv03-125"]);
});

test("vue pokédex : un autre user n'y accède pas", async () => {
  const t = convexTest(schema, modules);
  const userA = await makeUser(t, "Alice");
  const userB = await makeUser(t, "Bob");
  const pdxA = await t
    .withIdentity({ subject: userA })
    .mutation(api.pokedexes.create, { name: "A" });

  expect(
    await t.withIdentity({ subject: userB }).query(api.cardEntries.pokedexView, {
      pokedexId: pdxA,
    }),
  ).toBeNull();
});
