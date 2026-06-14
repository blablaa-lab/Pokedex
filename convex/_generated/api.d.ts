/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authz from "../authz.js";
import type * as cardEntries from "../cardEntries.js";
import type * as cards from "../cards.js";
import type * as http from "../http.js";
import type * as model_value from "../model/value.js";
import type * as pokedexes from "../pokedexes.js";
import type * as providers_tcgdex from "../providers/tcgdex.js";
import type * as providers_tcgdexMapping from "../providers/tcgdexMapping.js";
import type * as providers_types from "../providers/types.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authz: typeof authz;
  cardEntries: typeof cardEntries;
  cards: typeof cards;
  http: typeof http;
  "model/value": typeof model_value;
  pokedexes: typeof pokedexes;
  "providers/tcgdex": typeof providers_tcgdex;
  "providers/tcgdexMapping": typeof providers_tcgdexMapping;
  "providers/types": typeof providers_types;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
