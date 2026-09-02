/**
 * Public surface of the interpretation module (AIT-01 / Bước 1).
 */

export {
  createInterpretationModule,
  type InterpretationModule,
  type InterpretationModuleDependencies,
} from "./module.js";
export {
  buildInterpretationMessages,
  type InterpretationMessages,
  PROMPT_ID,
  PROMPT_RECORD,
  PROMPT_VERSION,
  SCHEMA_VERSION,
  TASK_ID,
} from "./prompt.js";

export {
  type ConfirmInterpretationCommand,
  InMemoryInterpretationRepository,
  InterpretationLifecycleError,
  type InterpretationRepository,
  interpretationRepository,
  type ReviseInterpretationCommand,
} from "./repository.js";
export {
  type GenerateInterpretationDeps,
  generateInterpretation,
  InterpretationGenerationError,
} from "./service.js";
