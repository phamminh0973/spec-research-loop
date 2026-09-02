/**
 * Drizzle SQLite schema — one table per entity, linked via foreign keys
 * through the research workflow.
 *
 * Workflow order and FK chain:
 *   projects (root)
 *     -> interpretations (project) – Step 1
 *       -> spec_graphs (project + interpretation) – Step 2
 *         -> sources (project + spec_graph) – Step 3 (literature)
 *           -> gap_proposals (project + spec_graph)
 *             -> atomic_claims (project + gap_proposal)
 *               -> contributions (project + gap_proposal)
 *               -> evidence_requirements (project + claim)
 *                 -> experiment_plans (project + gap_proposal)
 *                   -> judge_panels (project + experiment_plan)
 *                     -> research_specs (project + judge_panel)
 *                     -> finding_resolutions (project + judge_panel)
 *           -> evidence_spans (project + source) – also Step 3
 *           -> interpretation_decisions (project + interpretation) – Step 1 decisions
 *
 * Each table stores the full entity as JSON in `data` plus explicit FK
 * columns so SQLite can enforce that each step cannot exist before its
 * predecessor. All FKs use ON DELETE CASCADE. Foreign keys are enabled via
 * `PRAGMA foreign_keys = ON` in `client.ts`.
 *
 * Backed by Drizzle ORM + `node:sqlite` (DatabaseSync). Tables are created
 * via the built-in `migrate` API from `drizzle-orm/node-sqlite/migrator`
 * (see `src/db/client.ts` and `drizzle/`).
 */

import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  domain: text("domain"),
  rawIdea: text("raw_idea").notNull(),
  resourceConstraints: text("resource_constraints").notNull(), // JSON array
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ---------------------------------------------------------------------------
// Step 1 – Idea interpretation
// ---------------------------------------------------------------------------

export const interpretations = sqliteTable(
  "interpretations",
  {
    id: text("id").primaryKey(), // interpretationId
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    data: text("data").notNull(), // full InterpretationRecord JSON
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("interpretations_by_project").on(t.projectId)]
);

export const interpretationDecisions = sqliteTable(
  "interpretation_decisions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    interpretationId: text("interpretation_id")
      .notNull()
      .references(() => interpretations.id, { onDelete: "cascade" }),
    data: text("data").notNull(), // InterpretationDecision JSON
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("interpretation_decisions_by_project").on(t.projectId),
    index("interpretation_decisions_by_interpretation").on(t.interpretationId),
  ]
);

// ---------------------------------------------------------------------------
// Step 2 – Decomposition (spec graph)
// ---------------------------------------------------------------------------

export const specGraphs = sqliteTable(
  "spec_graphs",
  {
    // One graph per project – PK is projectId
    projectId: text("project_id")
      .primaryKey()
      .references(() => projects.id, { onDelete: "cascade" }),
    interpretationId: text("interpretation_id").references(
      () => interpretations.id,
      {
        onDelete: "set null",
      }
    ),
    data: text("data").notNull(), // SpecGraphView JSON
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("spec_graphs_by_interpretation").on(t.interpretationId)]
);

// ---------------------------------------------------------------------------
// Step 3 – Literature
// ---------------------------------------------------------------------------

export const sources = sqliteTable(
  "sources",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // FK to previous step's result – ensures spec graph exists first
    specGraphProjectId: text("spec_graph_project_id")
      .notNull()
      .references(() => specGraphs.projectId, { onDelete: "cascade" }),
    data: text("data").notNull(), // SourceDocument JSON
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("sources_by_project").on(t.projectId),
    index("sources_by_spec_graph").on(t.specGraphProjectId),
  ]
);

export const evidenceSpans = sqliteTable(
  "evidence_spans",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    data: text("data").notNull(), // EvidenceSpan JSON
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("evidence_spans_by_project").on(t.projectId),
    index("evidence_spans_by_source").on(t.sourceId),
  ]
);

// ---------------------------------------------------------------------------
// Steps 4-6 – Research design (gap / claim / evidence / experiment)
// ---------------------------------------------------------------------------

export const gapProposals = sqliteTable(
  "gap_proposals",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    specGraphProjectId: text("spec_graph_project_id")
      .notNull()
      .references(() => specGraphs.projectId, { onDelete: "cascade" }),
    data: text("data").notNull(), // GapProposalOutput JSON
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("gap_proposals_by_project").on(t.projectId),
    index("gap_proposals_by_spec_graph").on(t.specGraphProjectId),
  ]
);

export const atomicClaims = sqliteTable(
  "atomic_claims",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    gapProposalId: text("gap_proposal_id")
      .notNull()
      .references(() => gapProposals.id, { onDelete: "cascade" }),
    data: text("data").notNull(), // AtomicClaim JSON
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("atomic_claims_by_project").on(t.projectId),
    index("atomic_claims_by_gap").on(t.gapProposalId),
  ]
);

export const contributions = sqliteTable(
  "contributions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    gapProposalId: text("gap_proposal_id")
      .notNull()
      .references(() => gapProposals.id, { onDelete: "cascade" }),
    data: text("data").notNull(), // Contribution JSON
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("contributions_by_project").on(t.projectId),
    index("contributions_by_gap").on(t.gapProposalId),
  ]
);

export const evidenceRequirements = sqliteTable(
  "evidence_requirements",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    claimId: text("claim_id")
      .notNull()
      .references(() => atomicClaims.id, { onDelete: "cascade" }),
    data: text("data").notNull(), // EvidenceRequirement JSON
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("evidence_requirements_by_project").on(t.projectId),
    index("evidence_requirements_by_claim").on(t.claimId),
  ]
);

export const experimentPlans = sqliteTable(
  "experiment_plans",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    gapProposalId: text("gap_proposal_id")
      .notNull()
      .references(() => gapProposals.id, { onDelete: "cascade" }),
    data: text("data").notNull(), // ExperimentPlan JSON
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("experiment_plans_by_project").on(t.projectId),
    index("experiment_plans_by_gap").on(t.gapProposalId),
  ]
);

// ---------------------------------------------------------------------------
// Steps 7-10 – Judging, revision, spec generation
// ---------------------------------------------------------------------------

export const judgePanels = sqliteTable(
  "judge_panels",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    experimentPlanId: text("experiment_plan_id").references(
      () => experimentPlans.id,
      {
        onDelete: "set null",
      }
    ),
    data: text("data").notNull(), // JudgePanelResult JSON
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("judge_panels_by_project").on(t.projectId),
    index("judge_panels_by_experiment").on(t.experimentPlanId),
  ]
);

export const researchSpecs = sqliteTable(
  "research_specs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    judgePanelId: text("judge_panel_id").references(() => judgePanels.id, {
      onDelete: "set null",
    }),
    version: text("version").notNull(), // stored as text for simplicity, parsed as number
    data: text("data").notNull(), // ResearchSpec JSON
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("research_specs_by_project").on(t.projectId),
    index("research_specs_by_judge").on(t.judgePanelId),
  ]
);

export const findingResolutions = sqliteTable(
  "finding_resolutions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    judgePanelId: text("judge_panel_id")
      .notNull()
      .references(() => judgePanels.id, { onDelete: "cascade" }),
    data: text("data").notNull(), // FindingResolution JSON
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("finding_resolutions_by_project").on(t.projectId),
    index("finding_resolutions_by_judge").on(t.judgePanelId),
  ]
);
