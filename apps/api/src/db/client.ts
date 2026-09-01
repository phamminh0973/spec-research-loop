/**
 * Lazy, opt-in Postgres connection.
 *
 * The API must keep working with zero external services when
 * `DATABASE_URL` is unset — that is the mode every vitest suite runs in
 * today, and it stays true after this module lands. `getPool()` returns
 * `null` in that case; callers (see `persisted-map.ts`) treat `null` as
 * "run purely in-memory, do not touch the network."
 *
 * The pool itself is created once and reused (a fresh `Pool` per call
 * would exhaust connections under load), and `closePool()` lets tests and
 * graceful shutdown release it deterministically.
 */

import pg from "pg";
import { env } from "../env.js";

let pool: pg.Pool | null | undefined; // undefined = not yet resolved, null = intentionally disabled

/** Returns the shared pool, or `null` when `DATABASE_URL` is not configured. */
export function getPool(): pg.Pool | null {
  if (pool !== undefined) return pool;
  if (!env.DATABASE_URL) {
    pool = null;
    return pool;
  }
  pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  return pool;
}

/** Release the pool's connections. Call on graceful shutdown and between test runs that swap DATABASE_URL. */
export async function closePool(): Promise<void> {
  if (pool) await pool.end();
  pool = undefined;
}

/** True when persistence is actually configured for this process. */
export function isPersistenceEnabled(): boolean {
  return Boolean(env.DATABASE_URL);
}
