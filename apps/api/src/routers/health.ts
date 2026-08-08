/**
 * Health router.
 *
 * Exposes a single `health` query that returns the service identity and a
 * timestamp. It is intentionally not under `/trpc` so that Docker Compose
 * health checks and uptime probes do not have to speak the tRPC protocol.
 */

import { HealthStatusSchema } from "@specloop/schemas";
import { publicProcedure, router } from "../trpc/trpc.js";

const SERVICE_VERSION = "0.0.0";

export const healthRouter = router({
  health: publicProcedure.output(HealthStatusSchema).query(() => ({
    status: "ok" as const,
    service: "specloop-api" as const,
    version: SERVICE_VERSION,
    timestamp: new Date().toISOString(),
  })),
});
