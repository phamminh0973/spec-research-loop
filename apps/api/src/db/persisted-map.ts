/**
 * Map-compatible wrappers that transparently persist to Postgres.
 *
 * Every `*ByProject` store in `src/store/project-store.ts` is declared as
 * one of these instead of a plain `Map`. The public surface (`get`, `set`,
 * `clear`, `entries`, `values`, `keys`, `size`) is intentionally identical
 * to `Map`'s, so every existing module keeps working completely unchanged
 * — the whole persistence layer is invisible from the call sites' point of
 * view.
 *
 * Reads are always served from an in-memory cache (synchronous, exactly
 * like today) — Postgres is only ever a write-through target and a
 * startup hydration source, never on the read hot path. When
 * `DATABASE_URL` is unset, `getPool()` returns `null` and every write is a
 * no-op beyond updating the cache: this is exactly the mode the whole
 * vitest suite runs in today, so nothing about existing tests changes.
 *
 * `.clear()` deliberately only clears the in-memory cache, never Postgres.
 * `resetProjectStore()` (see project-store.ts) is a *test* reset; wiping
 * the durable store every time a test file calls it would be both slow
 * and wrong for anyone who happens to run tests with a real
 * `DATABASE_URL` configured.
 */

import type pg from "pg";
import { getPool } from "./client.js";
import { CREATE_STORE_ENTITIES_TABLE_SQL } from "./schema.js";

export interface PersistedMapOptions<V> {
  /** Identifies this store's rows in the shared `store_entities` table, e.g. "gapProposalsByProject". */
  storeKey: string;
  /** Convert a stored value to a JSON-safe shape. Defaults to identity (works for any plain JSON-shaped value, which is everything in this codebase — every value already passed through a Zod schema). */
  serialize?: (value: V) => unknown;
  /** Convert a JSON-safe shape back to the stored value. Defaults to identity. */
  deserialize?: (data: unknown) => V;
  /** Injectable for tests; defaults to the shared lazy pool. */
  pool?: () => pg.Pool | null;
  /** Called when a write-through fails. Never throws — persistence failures must not break request handling. */
  onError?: (err: unknown, context: string) => void;
}

function defaultOnError(err: unknown, context: string): void {
  // eslint-disable-next-line no-console
  console.error(`[persistence] ${context}:`, err);
}

/** A `Map<string, V>`-compatible store that write-throughs to Postgres. */
export class PersistedMap<V> {
  private readonly cache = new Map<string, V>();
  private readonly storeKey: string;
  private readonly getPool: () => pg.Pool | null;
  private readonly serialize: (value: V) => unknown;
  private readonly deserialize: (data: unknown) => V;
  private readonly onError: (err: unknown, context: string) => void;

  constructor(options: PersistedMapOptions<V>) {
    this.storeKey = options.storeKey;
    this.getPool = options.pool ?? getPool;
    this.serialize = options.serialize ?? ((v) => v as unknown);
    this.deserialize = options.deserialize ?? ((d) => d as V);
    this.onError = options.onError ?? defaultOnError;
  }

  get(key: string): V | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: V): this {
    this.cache.set(key, value);
    this.writeThrough(key, value);
    return this;
  }

  clear(): void {
    this.cache.clear();
  }

  entries(): IterableIterator<[string, V]> {
    return this.cache.entries();
  }

  values(): IterableIterator<V> {
    return this.cache.values();
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  get size(): number {
    return this.cache.size;
  }

  private writeThrough(key: string, value: V): void {
    const pool = this.getPool();
    if (!pool) return; // persistence disabled — stay purely in-memory
    const data = this.serialize(value);
    const updatedAt = new Date().toISOString();
    pool
      .query(
        `INSERT INTO store_entities (store_key, project_id, entity_key, data, updated_at)
         VALUES ($1, $2, 'value', $3::jsonb, $4::timestamptz)
         ON CONFLICT (store_key, project_id, entity_key)
         DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
         WHERE store_entities.updated_at <= EXCLUDED.updated_at`,
        [this.storeKey, key, JSON.stringify(data), updatedAt],
      )
      .catch((err: unknown) =>
        this.onError(err, `write-through failed for ${this.storeKey}/${key}`),
      );
  }

  /** Load every row for this store from Postgres into the cache. Call once at startup, before the server accepts requests. */
  async hydrate(): Promise<void> {
    const pool = this.getPool();
    if (!pool) return;
    const result = await pool.query<{ project_id: string; data: unknown }>(
      `SELECT project_id, data FROM store_entities WHERE store_key = $1 AND entity_key = 'value'`,
      [this.storeKey],
    );
    for (const row of result.rows) {
      this.cache.set(row.project_id, this.deserialize(row.data));
    }
  }
}

/**
 * A `Map<string, Map<string, V>>`-compatible store — the one shape
 * `PersistedMap` cannot cover, needed only by `interpretationsByProject`
 * (outer key: project id, inner key: interpretation id, since a project
 * keeps every superseded interpretation version alongside the active
 * one). Every entry of the inner map is written through individually so
 * each version is addressable and hydratable on its own.
 */
export class PersistedNestedMap<V> {
  private readonly cache = new Map<string, Map<string, V>>();
  private readonly storeKey: string;
  private readonly getPool: () => pg.Pool | null;
  private readonly serialize: (value: V) => unknown;
  private readonly deserialize: (data: unknown) => V;
  private readonly onError: (err: unknown, context: string) => void;

  constructor(options: PersistedMapOptions<V>) {
    this.storeKey = options.storeKey;
    this.getPool = options.pool ?? getPool;
    this.serialize = options.serialize ?? ((v) => v as unknown);
    this.deserialize = options.deserialize ?? ((d) => d as V);
    this.onError = options.onError ?? defaultOnError;
  }

  get(key: string): Map<string, V> | undefined {
    return this.cache.get(key);
  }

  /** Persists every entry currently in `innerMap`, not just new ones — simple and correct at this scale; a delta-only write is a viable later optimization. */
  set(key: string, innerMap: Map<string, V>): this {
    this.cache.set(key, innerMap);
    this.writeThrough(key, innerMap);
    return this;
  }

  clear(): void {
    this.cache.clear();
  }

  private writeThrough(projectId: string, innerMap: Map<string, V>): void {
    const pool = this.getPool();
    if (!pool) return;
    for (const [entityId, value] of innerMap) {
      const data = this.serialize(value);
      pool
        .query(
          `INSERT INTO store_entities (store_key, project_id, entity_key, data, updated_at)
           VALUES ($1, $2, $3, $4, now())
           ON CONFLICT (store_key, project_id, entity_key)
           DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
          [this.storeKey, projectId, entityId, JSON.stringify(data)],
        )
        .catch((err: unknown) =>
          this.onError(
            err,
            `write-through failed for ${this.storeKey}/${projectId}/${entityId}`,
          ),
        );
    }
  }

  async hydrate(): Promise<void> {
    const pool = this.getPool();
    if (!pool) return;
    const result = await pool.query<{
      project_id: string;
      entity_key: string;
      data: unknown;
    }>(`SELECT project_id, entity_key, data FROM store_entities WHERE store_key = $1`, [
      this.storeKey,
    ]);
    for (const row of result.rows) {
      let inner = this.cache.get(row.project_id);
      if (!inner) {
        inner = new Map<string, V>();
        this.cache.set(row.project_id, inner);
      }
      inner.set(row.entity_key, this.deserialize(row.data));
    }
  }
}

/** Ensure the shared `store_entities` table exists. Idempotent — safe to call on every startup. */
export async function ensureStoreSchema(pool: pg.Pool): Promise<void> {
  await pool.query(CREATE_STORE_ENTITIES_TABLE_SQL);
}
