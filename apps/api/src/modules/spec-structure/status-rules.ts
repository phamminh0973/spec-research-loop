import type {
  DecompositionOutput,
  DecompositionWarning,
  SpecNodeType,
} from "@specloop/schemas";

const requiredNodeTypes: readonly SpecNodeType[] = [
  "PROBLEM",
  "RESEARCH_QUESTION",
  "GAP",
  "CONTRIBUTION",
  "CLAIM",
];

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

/**
 * Apply only explicit, explainable integrity rules. In particular, this
 * function does not infer ambiguity from prose length or create evidence
 * provenance that the generator did not provide.
 */
export function applyDeterministicRules(
  output: DecompositionOutput
): DecompositionOutput {
  const nodeByRef = new Map(output.nodes.map((node) => [node.clientRef, node]));
  const warnings = output.warnings.filter(
    (warning) =>
      warning.code !== "AMBIGUOUS" ||
      (warning.targetClientRef !== undefined &&
        warning.targetClientRef !== null &&
        nodeByRef.has(warning.targetClientRef) &&
        warning.reason.trim().length > 0 &&
        warning.suggestedAction.trim().length > 0)
  );

  for (const type of requiredNodeTypes) {
    if (!output.nodes.some((node) => node.type === type)) {
      addWarning(warnings, {
        code: "MISSING",
        targetClientRef: null,
        targetType: type,
        reason: `No ${type} card was generated.`,
        suggestedAction: `Add or review a ${type} card before continuing.`,
      });
    }
  }

  for (const claim of output.nodes.filter((node) => node.type === "CLAIM")) {
    const hasSupportOrTest = output.relations.some(
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
  for (const relation of output.relations) {
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
    if (!source) {
      continue;
    }

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

  return { ...output, warnings };
}
