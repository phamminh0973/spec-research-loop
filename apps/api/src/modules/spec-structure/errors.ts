export class ConfirmationRequiredError extends Error {
  readonly code = "CONFIRMATION_REQUIRED" as const;

  constructor(projectId: string) {
    super(`Project ${projectId} requires a user-confirmed interpretation.`);
    this.name = "ConfirmationRequiredError";
  }
}

export class DecompositionValidationError extends Error {
  readonly code = "INVALID_DECOMPOSITION" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DecompositionValidationError";
  }
}

export class SpecGraphNotFoundError extends Error {
  readonly code = "SPEC_GRAPH_NOT_FOUND" as const;

  constructor(projectId: string) {
    super(`No decomposition graph exists for project ${projectId}.`);
    this.name = "SpecGraphNotFoundError";
  }
}

export class SpecNodeNotFoundError extends Error {
  readonly code = "SPEC_NODE_NOT_FOUND" as const;

  constructor(clientRef: string) {
    super(`No decomposition node exists for clientRef ${clientRef}.`);
    this.name = "SpecNodeNotFoundError";
  }
}

export class SpecRelationNotFoundError extends Error {
  readonly code = "SPEC_RELATION_NOT_FOUND" as const;

  constructor(relationId: string) {
    super(`No decomposition relation exists for id ${relationId}.`);
    this.name = "SpecRelationNotFoundError";
  }
}

export class SpecGraphEditValidationError extends Error {
  readonly code = "SPEC_GRAPH_EDIT_INVALID" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SpecGraphEditValidationError";
  }
}
