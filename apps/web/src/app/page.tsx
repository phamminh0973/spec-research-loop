"use client";

/**
 * Landing page.
 *
 * This page is intentionally minimal: it proves the end-to-end type link
 * between `apps/web` and `apps/api` by calling the typed `health` query.
 * The full workspace UI lands with US-01…US-20 in the product backlog.
 */

import { trpc } from "@/lib/trpc";

export default function HomePage() {
  // The procedure name, input shape and output shape are all inferred from
  // the `AppRouter` type exported by `@specloop/api`. If the backend renames
  // the procedure or changes its schema, this call site fails to compile.
  const healthQuery = trpc.health.health.useQuery();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>SpecLoop</h1>
      <p>
        Status: <strong>PLANNED scaffold</strong>. The vertical slice described
        in <code>docs/01-project-proposal.md</code> is not implemented yet.
      </p>
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Backend health (typed tRPC call)</h2>
        {healthQuery.isLoading && <p>Loading…</p>}
        {healthQuery.error && (
          <p style={{ color: "crimson" }}>
            Failed to reach the API: {healthQuery.error.message}
          </p>
        )}
        {healthQuery.data && (
          <pre
            style={{
              background: "#f5f5f5",
              padding: "0.75rem",
              borderRadius: 4,
            }}
          >
            {JSON.stringify(healthQuery.data, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}
