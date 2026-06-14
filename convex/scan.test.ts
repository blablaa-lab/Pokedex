import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

// On mocke le SEUL point externe (API TCGdex). L'orchestration scan→API est
// ce qui est testé, pas le HTTP ni l'OCR.
vi.mock("./providers/tcgdex", () => ({
  TcgdexProvider: class {
    async fetchPrice() {
      return { source: "tcgdex", eurAvg30: 5, updatedAt: 999 };
    }
    async fetchCard(tcgdexId: string) {
      const [setId, localId] = tcgdexId.split("-");
      return {
        card: {
          tcgdexId,
          nameFr: "Nouvelle",
          nameEn: "New",
          searchText: "Nouvelle New",
          localId,
          setId,
          setName: "Set API",
        },
        price: { source: "tcgdex", eurAvg30: 12, updatedAt: 1000 },
      };
    }
  },
}));

const modules = import.meta.glob(["./**/*.*s", "!./**/*.test.*", "!./**/*.d.ts"]);

test("scanLookup enrichit le prix d'un candidat du catalogue via l'API", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("sets", { tcgdexId: "base1", name: "Base", cardCount: 102 });
    await ctx.db.insert("cards", {
      tcgdexId: "base1-4",
      searchText: "Dracaufeu Charizard",
      localId: "4",
      setId: "base1",
    }); // pas de prix au départ
  });

  const res = await t.action(api.scan.scanLookup, { localId: "4", total: 102 });
  expect(res).toHaveLength(1);
  expect(res[0].tcgdexId).toBe("base1-4");
  // Prix récupéré automatiquement via l'API.
  expect(res[0].prices?.eurAvg30).toBe(5);
});

test("scanLookup va chercher dans l'API si la carte est absente du catalogue", async () => {
  const t = convexTest(schema, modules);
  // Catalogue vide ; set connu → fetchCard direct sur l'API.
  const res = await t.action(api.scan.scanLookup, { localId: "7", setId: "sv99" });
  expect(res).toHaveLength(1);
  expect(res[0].tcgdexId).toBe("sv99-7");
  expect(res[0].setName).toBe("Set API");
  expect(res[0].prices?.eurAvg30).toBe(12);

  // La carte a bien été insérée au catalogue (cache).
  const inDb = await t.run((ctx) =>
    ctx.db
      .query("cards")
      .withIndex("by_tcgdexId", (q) => q.eq("tcgdexId", "sv99-7"))
      .unique(),
  );
  expect(inDb).not.toBeNull();
});
