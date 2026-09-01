/**
 * Schema for the persistence layer backing `src/store/project-store.ts`.
 *
 * Deliberate P0 design choice: ONE generic table instead of one table per
 * entity type. Every value already round-trips through a Zod schema in
 * `@specloop/schemas` before it reaches a store (see `parseOrThrow`), so
 * Postgres's job here is durability, not shape enforcement — a normalized
 * table per entity would duplicate that validation for no real benefit at
 * this stage and would require a migration every time a module adds a
 * field. `store_key` identifies which in-memory Map a row belongs to
 * (e.g. "atomicClaimsByProject"), `project_id` scopes it, and `entity_key`
 * disambiguates rows within a project-scoped collection (the collection's
 * own id for list-shaped stores, or the literal string "value" for
 * single-value-per-project stores like `judgePanelsByProject`).
 *
 * This can be normalized into typed tables later without touching a
 * single call site — every module talks to `project-store.ts`'s Map-like
 * interface, never to SQL directly.
 */

export const STORE_ENTITIES_TABLE = "store_entities";

export const CREATE_STORE_ENTITIES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${STORE_ENTITIES_TABLE} (
  store_key   TEXT NOT NULL,
  project_id  TEXT NOT NULL,
  entity_key  TEXT NOT NULL,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_key, project_id, entity_key)
);

CREATE INDEX IF NOT EXISTS store_entities_by_project
  ON ${STORE_ENTITIES_TABLE} (store_key, project_id);
`;
