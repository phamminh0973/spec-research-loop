CREATE TABLE `atomic_claims` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`gap_proposal_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_atomic_claims_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_atomic_claims_gap_proposal_id_gap_proposals_id_fk` FOREIGN KEY (`gap_proposal_id`) REFERENCES `gap_proposals`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `contributions` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`gap_proposal_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_contributions_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_contributions_gap_proposal_id_gap_proposals_id_fk` FOREIGN KEY (`gap_proposal_id`) REFERENCES `gap_proposals`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `evidence_requirements` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`claim_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_evidence_requirements_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_evidence_requirements_claim_id_atomic_claims_id_fk` FOREIGN KEY (`claim_id`) REFERENCES `atomic_claims`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `evidence_spans` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`source_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_evidence_spans_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_evidence_spans_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `experiment_plans` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`gap_proposal_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_experiment_plans_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_experiment_plans_gap_proposal_id_gap_proposals_id_fk` FOREIGN KEY (`gap_proposal_id`) REFERENCES `gap_proposals`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `finding_resolutions` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`judge_panel_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_finding_resolutions_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_finding_resolutions_judge_panel_id_judge_panels_id_fk` FOREIGN KEY (`judge_panel_id`) REFERENCES `judge_panels`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `gap_proposals` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`spec_graph_project_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_gap_proposals_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_gap_proposals_spec_graph_project_id_spec_graphs_project_id_fk` FOREIGN KEY (`spec_graph_project_id`) REFERENCES `spec_graphs`(`project_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `interpretation_decisions` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`interpretation_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_interpretation_decisions_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_interpretation_decisions_interpretation_id_interpretations_id_fk` FOREIGN KEY (`interpretation_id`) REFERENCES `interpretations`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `interpretations` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`status` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_interpretations_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `judge_panels` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`experiment_plan_id` text,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_judge_panels_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_judge_panels_experiment_plan_id_experiment_plans_id_fk` FOREIGN KEY (`experiment_plan_id`) REFERENCES `experiment_plans`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`domain` text,
	`raw_idea` text NOT NULL,
	`resource_constraints` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_specs` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`judge_panel_id` text,
	`version` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_research_specs_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_research_specs_judge_panel_id_judge_panels_id_fk` FOREIGN KEY (`judge_panel_id`) REFERENCES `judge_panels`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`spec_graph_project_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_sources_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_sources_spec_graph_project_id_spec_graphs_project_id_fk` FOREIGN KEY (`spec_graph_project_id`) REFERENCES `spec_graphs`(`project_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `spec_graphs` (
	`project_id` text PRIMARY KEY,
	`interpretation_id` text,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_spec_graphs_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_spec_graphs_interpretation_id_interpretations_id_fk` FOREIGN KEY (`interpretation_id`) REFERENCES `interpretations`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `atomic_claims_by_project` ON `atomic_claims` (`project_id`);--> statement-breakpoint
CREATE INDEX `atomic_claims_by_gap` ON `atomic_claims` (`gap_proposal_id`);--> statement-breakpoint
CREATE INDEX `contributions_by_project` ON `contributions` (`project_id`);--> statement-breakpoint
CREATE INDEX `contributions_by_gap` ON `contributions` (`gap_proposal_id`);--> statement-breakpoint
CREATE INDEX `evidence_requirements_by_project` ON `evidence_requirements` (`project_id`);--> statement-breakpoint
CREATE INDEX `evidence_requirements_by_claim` ON `evidence_requirements` (`claim_id`);--> statement-breakpoint
CREATE INDEX `evidence_spans_by_project` ON `evidence_spans` (`project_id`);--> statement-breakpoint
CREATE INDEX `evidence_spans_by_source` ON `evidence_spans` (`source_id`);--> statement-breakpoint
CREATE INDEX `experiment_plans_by_project` ON `experiment_plans` (`project_id`);--> statement-breakpoint
CREATE INDEX `experiment_plans_by_gap` ON `experiment_plans` (`gap_proposal_id`);--> statement-breakpoint
CREATE INDEX `finding_resolutions_by_project` ON `finding_resolutions` (`project_id`);--> statement-breakpoint
CREATE INDEX `finding_resolutions_by_judge` ON `finding_resolutions` (`judge_panel_id`);--> statement-breakpoint
CREATE INDEX `gap_proposals_by_project` ON `gap_proposals` (`project_id`);--> statement-breakpoint
CREATE INDEX `gap_proposals_by_spec_graph` ON `gap_proposals` (`spec_graph_project_id`);--> statement-breakpoint
CREATE INDEX `interpretation_decisions_by_project` ON `interpretation_decisions` (`project_id`);--> statement-breakpoint
CREATE INDEX `interpretation_decisions_by_interpretation` ON `interpretation_decisions` (`interpretation_id`);--> statement-breakpoint
CREATE INDEX `interpretations_by_project` ON `interpretations` (`project_id`);--> statement-breakpoint
CREATE INDEX `judge_panels_by_project` ON `judge_panels` (`project_id`);--> statement-breakpoint
CREATE INDEX `judge_panels_by_experiment` ON `judge_panels` (`experiment_plan_id`);--> statement-breakpoint
CREATE INDEX `research_specs_by_project` ON `research_specs` (`project_id`);--> statement-breakpoint
CREATE INDEX `research_specs_by_judge` ON `research_specs` (`judge_panel_id`);--> statement-breakpoint
CREATE INDEX `sources_by_project` ON `sources` (`project_id`);--> statement-breakpoint
CREATE INDEX `sources_by_spec_graph` ON `sources` (`spec_graph_project_id`);--> statement-breakpoint
CREATE INDEX `spec_graphs_by_interpretation` ON `spec_graphs` (`interpretation_id`);