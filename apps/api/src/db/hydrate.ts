/**
 * Startup persistence bootstrap.
 *
 * Call `bootstrapPersistence()` once, before the server starts accepting
 * requests. When `DATABASE_URL` is unset this is a fast no-op (every
 * store's `.hydrate()` checks `getPool()` itself and returns immediately),
 * so it is always safe to call unconditionally — dev-without-Postgres and
 * test runs are unaffected.
 */

import { closePool, getPool, isPersistenceEnabled } from "./client.js";
import { ensureStoreSchema } from "./persisted-map.js";
import { ALL_PERSISTED_STORES } from "../store/project-store.js";
import { hydrateProjectsStore } from "../routers/projects.js";

export async function bootstrapPersistence(): Promise<void> {
  const pool = getPool();
  if (!pool) return; // DATABASE_URL not set — pure in-memory mode.

  await ensureStoreSchema(pool);
  await Promise.all([hydrateProjectsStore(), ...ALL_PERSISTED_STORES.map((s) => s.hydrate())]);
}

export { closePool, isPersistenceEnabled };
