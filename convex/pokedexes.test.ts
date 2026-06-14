import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

// convex-test enregistre les modules de fonctions via ce glob. Forme tableau
// avec négations (API Vite fiable ; l'extglob !(...) n'est pas géré par le
// moteur de glob de Vite 8). DOIT inclure _generated/ et exclure les tests.
const modules = import.meta.glob(["./**/*.*s", "!./**/*.test.*", "!./**/*.d.ts"]);

async function makeUser(t: ReturnType<typeof convexTest>, name: string) {
  return await t.run((ctx) => ctx.db.insert("users", { name }));
}

test("sécurité : un user ne lit/modifie/supprime que ses propres pokédex", async () => {
  const t = convexTest(schema, modules);
  const userA = await makeUser(t, "Alice");
  const userB = await makeUser(t, "Bob");
  const asA = t.withIdentity({ subject: userA });
  const asB = t.withIdentity({ subject: userB });

  const pdxA = await asA.mutation(api.pokedexes.create, { name: "Collec d'Alice" });

  // A voit le sien.
  const listA = await asA.query(api.pokedexes.list, {});
  expect(listA).toHaveLength(1);
  expect(listA[0]._id).toBe(pdxA);

  // B ne voit pas celui de A.
  expect(await asB.query(api.pokedexes.list, {})).toHaveLength(0);
  expect(await asB.query(api.pokedexes.get, { pokedexId: pdxA })).toBeNull();

  // B ne peut ni renommer ni supprimer celui de A.
  await expect(
    asB.mutation(api.pokedexes.rename, { pokedexId: pdxA, name: "piraté" }),
  ).rejects.toThrow();
  await expect(
    asB.mutation(api.pokedexes.remove, { pokedexId: pdxA }),
  ).rejects.toThrow();

  // Le pokédex de A est intact.
  const stillThere = await asA.query(api.pokedexes.get, { pokedexId: pdxA });
  expect(stillThere?.name).toBe("Collec d'Alice");
});

test("multi-pokédex + déconnecté ne voit rien", async () => {
  const t = convexTest(schema, modules);
  const userA = await makeUser(t, "Alice");
  const asA = t.withIdentity({ subject: userA });

  await asA.mutation(api.pokedexes.create, { name: "Cartes vintage" });
  await asA.mutation(api.pokedexes.create, { name: "Cartes modernes" });
  expect(await asA.query(api.pokedexes.list, {})).toHaveLength(2);

  // Sans identité : liste vide, création refusée.
  expect(await t.query(api.pokedexes.list, {})).toHaveLength(0);
  await expect(
    t.mutation(api.pokedexes.create, { name: "anon" }),
  ).rejects.toThrow();
});

test("suppression en cascade : les entrées du pokédex partent avec lui", async () => {
  const t = convexTest(schema, modules);
  const userA = await makeUser(t, "Alice");
  const asA = t.withIdentity({ subject: userA });
  const pdx = await asA.mutation(api.pokedexes.create, { name: "Collec" });

  // Carte au catalogue + entrée directe (l'API d'entrées arrive en P5).
  const cardId = await t.run((ctx) =>
    ctx.db.insert("cards", {
      tcgdexId: "base1-4",
      searchText: "Dracaufeu Charizard",
      localId: "4",
      setId: "base1",
    }),
  );
  await t.run((ctx) =>
    ctx.db.insert("cardEntries", {
      pokedexId: pdx,
      userId: userA,
      cardId,
      quantity: 1,
    }),
  );

  await asA.mutation(api.pokedexes.remove, { pokedexId: pdx });

  const remaining = await t.run((ctx) => ctx.db.query("cardEntries").collect());
  expect(remaining).toHaveLength(0);
});
