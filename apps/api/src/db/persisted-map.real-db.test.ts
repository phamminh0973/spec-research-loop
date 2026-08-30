/**
 * Integration tests against a REAL Postgres instance — not a mock.
 *
 * These only run when `TEST_DATABASE_URL` is set (see `.env.example` /
 * README for local setup); they are skipped by default so `vitest run`
 * stays zero-dependency for every other contributor and for CI without a
 * database service. This file is what actually proves the write-through
 * and hydration behavior works against real Postgres, rather than just
 * asserting the in-memory fallback path (which `persisted-map.test.ts`
 * covers without a database).
 */

import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ensureStoreSchema, PersistedMap, PersistedNestedMap } from "./persisted-map.js";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeIfDb = TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb("PersistedMap against a real Postgres instance", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: TEST_DATABASE_URL });
    await ensureStoreSchema(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(
      "DELETE FROM store_entities WHERE store_key LIKE 'test_%'",
    );
  });

  it("writes through on .set() and reads it back via a fresh connection", async () => {
    const storeKey = "test_flat_store";
    const map = new PersistedMap<{ label: string; count: number }>({
      storeKey,
      pool: () => pool,
    });

    map.set("project-1", { label: "hello", count: 1 });
    // write-through is fire-and-forget; give the query a tick to land.
    await new Promise((r) => setTimeout(r, 50));

    const rows = await pool.query(
      "SELECT project_id, data FROM store_entities WHERE store_key = $1",
      [storeKey],
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].project_id).toBe("project-1");
    expect(rows.rows[0].data).toEqual({ label: "hello", count: 1 });
  });

  it("hydrates a fresh PersistedMap instance from rows written by a previous one", async () => {
    const storeKey = "test_hydrate_store";
    const writer = new PersistedMap<{ n: number }>({ storeKey, pool: () => pool });
    writer.set("p1", { n: 1 });
    writer.set("p2", { n: 2 });
    await new Promise((r) => setTimeout(r, 50));

    // Simulate a server restart: a brand-new instance, empty cache.
    const reader = new PersistedMap<{ n: number }>({ storeKey, pool: () => pool });
    expect(reader.get("p1")).toBeUndefined();

    await reader.hydrate();

    expect(reader.get("p1")).toEqual({ n: 1 });
    expect(reader.get("p2")).toEqual({ n: 2 });
  });

  it("overwrites the same key idempotently (ON CONFLICT upsert)", async () => {
    const storeKey = "test_upsert_store";
    const map = new PersistedMap<{ v: number }>({ storeKey, pool: () => pool });

    map.set("p1", { v: 1 });
    await new Promise((r) => setTimeout(r, 30));
    map.set("p1", { v: 2 });
    await new Promise((r) => setTimeout(r, 30));

    const rows = await pool.query(
      "SELECT data FROM store_entities WHERE store_key = $1 AND project_id = 'p1'",
      [storeKey],
    );
    expect(rows.rows).toHaveLength(1); // not two rows — the primary key upserts, doesn't duplicate
    expect(rows.rows[0].data).toEqual({ v: 2 });
  });

  it("persists and hydrates a nested map (interpretationsByProject's shape) entry by entry", async () => {
    const storeKey = "test_nested_store";
    const writer = new PersistedNestedMap<{ text: string }>({ storeKey, pool: () => pool });
    const inner = new Map<string, { text: string }>();
    inner.set("interp-1", { text: "first version" });
    inner.set("interp-2", { text: "second version" });
    writer.set("project-1", inner);
    await new Promise((r) => setTimeout(r, 50));

    const rows = await pool.query(
      "SELECT entity_key, data FROM store_entities WHERE store_key = $1 ORDER BY entity_key",
      [storeKey],
    );
    expect(rows.rows).toHaveLength(2);

    const reader = new PersistedNestedMap<{ text: string }>({ storeKey, pool: () => pool });
    await reader.hydrate();
    const hydratedInner = reader.get("project-1");
    expect(hydratedInner?.get("interp-1")).toEqual({ text: "first version" });
    expect(hydratedInner?.get("interp-2")).toEqual({ text: "second version" });
  });

  it("stays in pure in-memory mode and never touches the database when pool() returns null", async () => {
    const storeKey = "test_disabled_store";
    const map = new PersistedMap<{ v: number }>({ storeKey, pool: () => null });

    map.set("p1", { v: 1 });
    await new Promise((r) => setTimeout(r, 30));

    expect(map.get("p1")).toEqual({ v: 1 }); // in-memory cache still works
    const rows = await pool.query(
      "SELECT * FROM store_entities WHERE store_key = $1",
      [storeKey],
    );
    expect(rows.rows).toHaveLength(0); // nothing written to Postgres
  });
});
