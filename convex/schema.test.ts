import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";

// Smoke test P1 : prouve que le harnais convex-test + le schéma autoritaire
// sont câblés (insertion + relecture en process, sans déploiement Convex).
// La logique métier réelle (recherche bilingue, sécurité, valeur) est testée
// dans les phases suivantes.
test("convex-test : insertion et relecture d'une carte du catalogue", async () => {
  const t = convexTest(schema);

  const id = await t.run(async (ctx) => {
    return await ctx.db.insert("cards", {
      tcgdexId: "base1-4",
      nameFr: "Dracaufeu",
      nameEn: "Charizard",
      searchText: "Dracaufeu Charizard",
      localId: "4",
      setId: "base1",
    });
  });

  const card = await t.run(async (ctx) => ctx.db.get(id));

  expect(card?.searchText).toBe("Dracaufeu Charizard");
  expect(card?.nameFr).toBe("Dracaufeu");
  expect(card?.nameEn).toBe("Charizard");
});
