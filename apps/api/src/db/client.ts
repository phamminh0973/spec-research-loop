/**
 * Lazy Drizzle + SQLite connection.
 *
 * Uses `node:sqlite`'s `DatabaseSync` via `drizzle-orm/node-sqlite`.
 * See https://orm.drizzle.team/docs/get-started/node-sqlite-new
 *
 * - If `DATABASE_PATH` (or `DB_FILE_NAME` / legacy `DATABASE_URL` that looks
 *   like a file path) is set → file-backed SQLite at that path.
 * - Otherwise → in-memory SQLite (`:memory:`).
 *
 * Tables are created via the built-in `migrate` API from
 * `drizzle-orm/node-sqlite/migrator` using SQL files in `drizzle/`
 * (generated via `drizzle-kit generate`). No raw `CREATE TABLE` SQL is
 * executed in application code.
 *
 * The database is created once and reused; `closeDb()` releases it for
 * graceful shutdown and for tests that need a fresh instance.
 */

import { existsSync, mkdirSync } from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import type { NodeSQLiteDatabase } from "drizzle-orm/node-sqlite";
import { env } from "../env.js";

export type DrizzleDb = NodeSQLiteDatabase;

let sqlite: DatabaseSync | undefined;
let db: DrizzleDb | undefined;

/**
 * Resolve the SQLite file path.
 * Precedence: DATABASE_PATH > DB_FILE_NAME > DATABASE_URL (if it looks like a path).
 * Returns ":memory:" when nothing is configured.
 */
function resolveDbPath(): string {
  const direct = env.DATABASE_PATH ?? env.DB_FILE_NAME;
  if (direct) return direct;

  const legacy = env.DATABASE_URL;
  if (legacy && !legacy.startsWith("postgres://") && !legacy.startsWith("postgresql://")) {
    return legacy;
  }
  return ":memory:";
}

function resolveMigrationsFolder(): string {
  const candidates = [
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../drizzle"),
    path.resolve(process.cwd(), "drizzle"),
    path.resolve(process.cwd(), "apps/api/drizzle"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  // Fallback to the first candidate — migrate will throw with a clear message
  return candidates[0]!;
}

/** Returns the shared Drizzle SQLite database (always non-null). */
export function getDb(): DrizzleDb {
  if (db) return db;

  const dbPath = resolveDbPath();

  if (dbPath !== ":memory:") {
    try {
      mkdirSync(dirname(dbPath), { recursive: true });
    } catch {
      // Ignore — DatabaseSync will throw with a clearer message
    }
  }

  sqlite = new DatabaseSync(dbPath);
  try {
    sqlite.exec("PRAGMA journal_mode = WAL;");
  } catch {
    // Ignore — not supported in all environments.
  }
  try {
    sqlite.exec("PRAGMA foreign_keys = ON;");
  } catch {
    // Ignore
  }

  db = drizzle({ client: sqlite });

  // Create tables via the built-in migrator — no raw SQL in application code.
  try {
    migrate(db, { migrationsFolder: resolveMigrationsFolder() });
  } catch (err) {
    // In tests with isolated in-memory DBs created via `new DatabaseSync`,
    // the global migrator may have already run; ignore duplicate errors.
    // Re-throw unexpected errors so they are visible.
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("already exists")) {
      // eslint-disable-next-line no-console
      console.error("[db] migrate failed:", err);
      throw err;
    }
  }

  return db;
}

/** Alias kept for backwards compatibility — prefer `getDb()`. */
export function getPool(): DrizzleDb {
  return getDb();
}

/** Returns the underlying DatabaseSync instance (for raw exec/close). */
export function getSqlite(): DatabaseSync | undefined {
  if (!sqlite) getDb();
  return sqlite;
}

/** Close the database connection. Call on graceful shutdown and between test runs. */
export async function closeDb(): Promise<void> {
  if (sqlite) {
    try {
      sqlite.close();
    } catch {
      // Ignore
    }
  }
  sqlite = undefined;
  db = undefined;
}

/** Legacy alias — prefer `closeDb()`. */
export async function closePool(): Promise<void> {
  await closeDb();
}

/** True when a file-backed database is configured (not in-memory). */
export function isPersistenceEnabled(): boolean {
  const path = resolveDbPath();
  return path !== ":memory:";
}

/** For tests: reset the singleton so the next `getDb()` creates a fresh :memory: instance. */
export function __resetDbForTests(): void {
  sqlite = undefined;
  db = undefined;
}
