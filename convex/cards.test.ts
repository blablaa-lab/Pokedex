import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.*s", "!./**/*.test.*", "!./**/*.d.ts"]);

/** Échantillon de catalogue représentatif (bilingue, 2 sets). */
async function seedSample(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("cards", {
      tcgdexId: "base1-4",
      nameFr: "Dracaufeu",
      nameEn: "Charizard",
      searchText: "Dracaufeu Charizard",
      localId: "4",
      setId: "base1",
      setName: "Set de Base",
    });
    await ctx.db.insert("cards", {
      tcgdexId: "base1-58",
      nameFr: "Pikachu",
      nameEn: "Pikachu",
      searchText: "Pikachu Pikachu",
      localId: "58",
      setId: "base1",
    });
    await ctx.db.insert("cards", {
      tcgdexId: "sv03-125",
      nameFr: "Dracaufeu ex",
      nameEn: "Charizard ex",
      searchText: "Dracaufeu ex Charizard ex",
      localId: "125",
      setId: "sv03",
    });
  });
}

test("recherche bilingue : « Charizard » ET « Dracaufeu » renvoient la même carte", async () => {
  const t = convexTest(schema, modules);
  await seedSample(t);

  const byEn = await t.query(api.cards.search, { text: "Charizard" });
  const byFr = await t.query(api.cards.search, { text: "Dracaufeu" });

  const idsEn = byEn.map((c) => c.tcgdexId);
  const idsFr = byFr.map((c) => c.tcgdexId);

  // Les deux trouvent la carte base1-4 (le nom EN matche via searchText).
  expect(idsEn).toContain("base1-4");
  expect(idsFr).toContain("base1-4");
});

test("filtre set : restreint la recherche à un set", async () => {
  const t = convexTest(schema, modules);
  await seedSample(t);

  const all = await t.query(api.cards.search, { text: "Dracaufeu" });
  expect(all.map((c) => c.tcgdexId).sort()).toEqual(["base1-4", "sv03-125"]);

  const onlyBase = await t.query(api.cards.search, {
    text: "Dracaufeu",
    setId: "base1",
  });
  expect(onlyBase.map((c) => c.tcgdexId)).toEqual(["base1-4"]);
});

test("recherche par numéro de collecteur (set + localId)", async () => {
  const t = convexTest(schema, modules);
  await seedSample(t);

  const res = await t.query(api.cards.search, { setId: "base1", localId: "4" });
  expect(res).toHaveLength(1);
  expect(res[0].tcgdexId).toBe("base1-4");

  // Numéro inexistant dans le set → vide.
  expect(await t.query(api.cards.search, { setId: "base1", localId: "999" })).toHaveLength(0);
});

test("sans critère → liste vide", async () => {
  const t = convexTest(schema, modules);
  await seedSample(t);
  expect(await t.query(api.cards.search, {})).toHaveLength(0);
});
