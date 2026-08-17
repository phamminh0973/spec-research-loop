/**
 * Public surface of the spec-structure module (AIT-02 / Bước 2).
 */

export {
  DECOMPOSITION_PROMPT_ID,
  DECOMPOSITION_PROMPT_VERSION,
  DECOMPOSITION_TASK_ID,
  buildDecompositionMessages,
  decompositionPrompt,
  type DecompositionMessages,
} from "./prompt.js";

export {
  ConfirmationRequiredError,
  DecompositionValidationError,
  SpecGraphConflictError,
  SpecGraphEditValidationError,
  SpecGraphNotFoundError,
  SpecNodeNotFoundError,
  SpecRelationNotFoundError,
} from "./errors.js";

export {
  LlmDecompositionGenerator,
  type LlmDecompositionGeneratorDependencies,
} from "./generator.js";

export {
  Step1ConfirmedInterpretationReader,
  type Step1ProjectBoundary,
  type Step1ProjectReader,
} from "./interpretation-reader-adapter.js";

export { InMemorySpecGraphStore } from "./repository.js";

export type {
  ChangeStatusCommand,
  ConfirmedInterpretationReader,
  CreateRelationCommand,
  DecompositionGenerator,
  DecompositionServiceDependencies,
  DeleteRelationCommand,
  SpecGraphRepository,
  SpecGraphStore,
  UpdateNodeCommand,
} from "./ports.js";

export { DecompositionService } from "./service.js";

export {
  applyDeterministicRules,
  calculateDeterministicWarnings,
  type RuleGraph,
} from "./status-rules.js";

export {
  createSpecStructureModule,
  type SpecStructureModule,
  type SpecStructureModuleDependencies,
} from "./module.js";