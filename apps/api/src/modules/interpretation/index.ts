/**
 * Public surface of the interpretation module (AIT-01 / Bước 1).
 */

export {
  PROMPT_ID,
  PROMPT_VERSION,
  SCHEMA_VERSION,
  TASK_ID,
  PROMPT_RECORD,
  buildInterpretationMessages,
  type InterpretationChatMessage,
} from "./prompt.js";

export {
  generateInterpretation,
  InterpretationGenerationError,
  type GenerateInterpretationDeps,
} from "./service.js";

export {
  InMemoryInterpretationRepository,
  InterpretationLifecycleError,
  interpretationRepository,
  type ConfirmInterpretationCommand,
  type InterpretationRepository,
  type ReviseInterpretationCommand,
} from "./repository.js";

export {
  createInterpretationModule,
  type InterpretationModule,
  type InterpretationModuleDependencies,
} from "./module.js";
