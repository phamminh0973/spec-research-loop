/**
 * Startup persistence bootstrap for Drizzle + SQLite.
 *
 * Call `bootstrapPersistence()` once, before the server starts accepting
 * requests. With the Drizzle `migrate` API, simply obtaining the DB via
 * `getDb()` triggers the pending migrations (see `src/db/client.ts`).
 * Idempotent and safe for `:memory:`.
 *
 * Docs: https://orm.drizzle.team/docs/get-started/node-sqlite-new
 */

import { closeDb, getDb, isPersistenceEnabled } from "./client.js";

export async function bootstrapPersistence(): Promise<void> {
  // getDb() lazily creates the DatabaseSync and runs `migrate(...)` — that
  // ensures `store_entities` exists before the server handles requests.
  getDb();
}

export { closeDb, closeDb as closePool, getDb, getDb as getPool, isPersistenceEnabled };
