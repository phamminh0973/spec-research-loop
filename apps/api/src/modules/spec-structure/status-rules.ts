import type {
  DecompositionNode,
  DecompositionOutput,
  DecompositionRelation,
  DecompositionWarning,
  DecompositionWarningCode,
  SpecNodeType,
} from "@specloop/schemas";

const requiredNodeTypes: readonly SpecNodeType[] = [
  "PROBLEM",
  "RESEARCH_QUESTION",
  "GAP",
  "CONTRIBUTION",
  "CLAIM",
  "CONSTRAINT",
  "RISK",
  "OPEN_QUESTION",
];

export type RuleGraph = {
  projectId: string;
  nodes: readonly Pick<DecompositionNode, "projectId" | "clientRef" | "type">[];
  relations: readonly Pick<
    DecompositionRelation,
    "projectId" | "sourceClientRef" | "targetClientRef" | "type"
  >[];
};

function warningKey(warning: DecompositionWarning): string {
  return [warning.code, warning.targetClientRef ?? "", warning.targetType].join(
    ":"
  );
}

function addWarning(
  warnings: DecompositionWarning[],
  warning: DecompositionWarning
): void {
  const keys = new Set(warnings.map(warningKey));
  if (!keys.has(warningKey(warning))) {
    warnings.push(warning);
  }
}

function isValidExistingWarning(
  warning: DecompositionWarning,
  nodeByRef: ReadonlyMap<string, RuleGraph["nodes"][number]>
): boolean {
  if (!warning.reason.trim() || !warning.suggestedAction.trim()) return false;
  if (warning.code === "MISSING") {
    return (
      warning.targetClientRef === undefined || warning.targetClientRef === null
    );
  }

  if (!warning.targetClientRef) return false;
  return nodeByRef.get(warning.targetClientRef)?.type === warning.targetType;
}

/**
 * Calculate explainable warnings for a graph. Existing warnings may be
 * preserved selectively for generator-proposed findings such as ambiguity;
 * structural missing/unsupported/conflict findings are always recalculated.
 */
export function calculateDeterministicWarnings(
  graph: RuleGraph,
  options: {
    existingWarnings?: readonly DecompositionWarning[];
    preserveCodes?: readonly DecompositionWarningCode[];
  } = {}
): DecompositionWarning[] {
  const nodeByRef = new Map(graph.nodes.map((node) => [node.clientRef, node]));
  const preserveCodes = new Set(options.preserveCodes ?? ["AMBIGUOUS"]);
  const warnings: DecompositionWarning[] = [];

  for (const warning of options.existingWarnings ?? []) {
    if (
      preserveCodes.has(warning.code) &&
      isValidExistingWarning(warning, nodeByRef)
    ) {
      addWarning(warnings, warning);
    }
  }

  for (const type of requiredNodeTypes) {
    if (!graph.nodes.some((node) => node.type === type)) {
      addWarning(warnings, {
        code: "MISSING",
        targetClientRef: null,
        targetType: type,
        reason: `No ${type} card was generated.`,
        suggestedAction: `Add or review a ${type} card before continuing.`,
      });
    }
  }

  for (const claim of graph.nodes.filter((node) => node.type === "CLAIM")) {
    const hasSupportOrTest = graph.relations.some(
      (relation) =>
        relation.sourceClientRef === claim.clientRef &&
        (relation.type === "SUPPORTED_BY" || relation.type === "TESTED_BY")
    );

    if (!hasSupportOrTest) {
      addWarning(warnings, {
        code: "UNSUPPORTED",
        targetClientRef: claim.clientRef,
        targetType: "CLAIM",
        reason:
          "The claim has no supporting evidence or planned experiment relation.",
        suggestedAction:
          "Link the claim to evidence or a planned experiment, or keep it marked for review.",
      });
    }
  }

  const relationKinds = new Map<string, Set<string>>();
  for (const relation of graph.relations) {
    const key = `${relation.sourceClientRef}->${relation.targetClientRef}`;
    const kinds = relationKinds.get(key) ?? new Set<string>();
    kinds.add(relation.type);
    relationKinds.set(key, kinds);
  }

  for (const [pair, kinds] of relationKinds) {
    if (!kinds.has("SUPPORTED_BY") || !kinds.has("CONTRADICTED_BY")) {
      continue;
    }

    const [sourceClientRef] = pair.split("->");
    const source = sourceClientRef ? nodeByRef.get(sourceClientRef) : undefined;
    if (!source) continue;

    addWarning(warnings, {
      code: "CONFLICT",
      targetClientRef: source.clientRef,
      targetType: source.type,
      reason:
        "The same ordered node pair is marked both supported and contradicted.",
      suggestedAction:
        "Review the relation direction and keep only the relation supported by the evidence.",
    });
  }

  return warnings;
}

function issuePriority(code: DecompositionWarningCode): number {
  switch (code) {
    case "CONFLICT":
      return 4;
    case "AMBIGUOUS":
      return 3;
    case "UNSUPPORTED":
      return 2;
    case "MISSING":
      return 1;
  }
}

/**
 * Apply only explicit, explainable integrity rules. Generator warnings are
 * validated, deterministic structural findings are recalculated, and a
 * targeted finding is reflected on its AI-proposed node status/reason.
 */
export function applyDeterministicRules(
  output: DecompositionOutput
): DecompositionOutput {
  const warnings = calculateDeterministicWarnings(output, {
    existingWarnings: output.warnings,
    preserveCodes: ["AMBIGUOUS"],
  });
  const warningByRef = new Map<string, DecompositionWarning>();

  for (const warning of warnings) {
    if (!warning.targetClientRef) continue;
    const current = warningByRef.get(warning.targetClientRef);
    if (!current || issuePriority(warning.code) > issuePriority(current.code)) {
      warningByRef.set(warning.targetClientRef, warning);
    }
  }

  const nodes = output.nodes.map((node) => {
    const warning = warningByRef.get(node.clientRef);
    if (!warning) return node;
    return {
      ...node,
      status: warning.code,
      reason: warning.reason,
    };
  });

  return { ...output, nodes, warnings };
}
