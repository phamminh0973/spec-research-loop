import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Contract tests never call a real provider (they inject a fake OpenAI
    // client — see src/interpretation/service.test.ts), but importing
    // src/env.ts eagerly validates process.env at module load time, so a
    // syntactically valid placeholder is required just to let the module
    // graph load in a credential-less test environment.
    env: {
      OPENAI_API_KEY: "test-placeholder-key",
      LLM_MODEL: "test-model",
    },
  },
});
