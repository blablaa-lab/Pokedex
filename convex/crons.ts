import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Déclencheur 2 (PRD §6) : refresh quotidien des prix, borné aux cartes
// périmées (> 24h) ET référencées par au moins une entrée.
const crons = cronJobs();

crons.daily(
  "refresh-stale-referenced-prices",
  { hourUTC: 3, minuteUTC: 0 },
  internal.prices.refreshStaleReferenced,
);

export default crons;
